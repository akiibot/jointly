import path from "node:path";
import {
  reasoningRequestSchema,
  sha256,
  stagePayloadSchemas,
  type InferenceTransport,
  type ReasoningRequest,
  type ReasoningResult,
} from "./contracts.js";
import { ReasoningError } from "./errors.js";
import { ReasoningRunBudget, type SemanticAttemptKind } from "./budget.js";

function validatePath(candidate: string, prefixes: string[], stage: ReasoningRequest["stage"]): void {
  if (path.isAbsolute(candidate) || candidate.split(/[\\/]/).includes("..")) {
    throw new ReasoningError("invalid-output", `proposal path escapes the repository: ${candidate}`);
  }
  const normalized = candidate.replace(/\\/g, "/");
  if (!prefixes.some((prefix) => normalized.startsWith(prefix.replace(/\\/g, "/")))) {
    throw new ReasoningError("invalid-output", `proposal path is outside the stage allowlist: ${candidate}`);
  }
  if (stage === "propose-test" && (!normalized.startsWith("generated-tests/") || !normalized.endsWith(".test.ts"))) {
    throw new ReasoningError("invalid-output", "generated tests must use generated-tests/*.test.ts");
  }
}

function validateReferences(request: ReasoningRequest, payload: unknown): void {
  const serialized = JSON.stringify(payload);
  const contextIds = new Set(request.context.map((entry) => entry.id));
  const contextDigests = new Set(request.context.map((entry) => entry.digest));
  const requirementIds = new Set(request.allowedRequirementIds);
  const visit = (value: unknown, key?: string): void => {
    if (Array.isArray(value)) return value.forEach((entry) => visit(entry, key));
    if (!value || typeof value !== "object") {
      if (key === "contextId" && typeof value === "string" && !contextIds.has(value)) throw new ReasoningError("invalid-output", `unknown context reference: ${value}`);
      if (key === "digest" && typeof value === "string" && !contextDigests.has(value)) throw new ReasoningError("invalid-output", `unknown context digest: ${value}`);
      return;
    }
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  };
  visit(payload);
  for (const match of serialized.matchAll(/"(?:requirementIds|implicatedRequirementIds|preservedRequirementIds|revisedRequirementIds)":\[(.*?)\]/g)) {
    for (const id of match[1]!.match(/"([^"]+)"/g) ?? []) {
      const parsed = JSON.parse(id) as string;
      if (!requirementIds.has(parsed)) throw new ReasoningError("invalid-output", `unknown requirement reference: ${parsed}`);
    }
  }
}

export class ReasoningEngine {
  constructor(private readonly transport: InferenceTransport) {}

  async run(rawRequest: unknown, outerSignal?: AbortSignal): Promise<ReasoningResult> {
    const parsed = reasoningRequestSchema.safeParse(rawRequest);
    if (!parsed.success) throw new ReasoningError("invalid-output", `invalid reasoning request: ${parsed.error.message}`);
    const request = parsed.data;
    if (Date.parse(request.deadlineAt) <= Date.now() || request.budget.remainingDurationMs <= 0) {
      throw new ReasoningError("budget-exhausted", "reasoning deadline or duration budget is exhausted");
    }
    const estimatedInputTokens = Math.ceil(request.context.reduce((total, entry) => total + entry.content.length, 0) / 4);
    if (estimatedInputTokens > request.budget.remainingInputTokens || request.model.maxOutputTokens > request.budget.remainingOutputTokens) {
      throw new ReasoningError("budget-exhausted", "reasoning token budget is exhausted");
    }
    const controller = new AbortController();
    const deadlineMs = Math.min(Date.parse(request.deadlineAt) - Date.now(), request.budget.remainingDurationMs);
    const timer = setTimeout(() => controller.abort(new ReasoningError("timeout", "reasoning request exceeded its deadline", true)), deadlineMs);
    const abort = () => controller.abort(new ReasoningError("cancelled", "reasoning request was cancelled"));
    outerSignal?.addEventListener("abort", abort, { once: true });
    const started = Date.now();
    try {
      const response = await this.transport.infer(request, controller.signal);
      if (response.finishReason === "refusal" || response.finishReason === "content-filter") {
        throw new ReasoningError("refusal", `provider returned ${response.finishReason}`);
      }
      if (response.finishReason === "length") throw new ReasoningError("invalid-output", "provider output was truncated");
      let candidate: unknown;
      try { candidate = JSON.parse(response.content); } catch { throw new ReasoningError("invalid-output", "provider output is not complete JSON"); }
      const payload = stagePayloadSchemas[request.stage].safeParse(candidate);
      if (!payload.success) throw new ReasoningError("invalid-output", `provider output failed ${request.stage} schema validation: ${payload.error.message}`);
      validateReferences(request, payload.data);
      if (request.stage === "propose-test") validatePath((payload.data as { path: string }).path, request.allowedWritePrefixes, request.stage);
      if (request.stage === "propose-repair") {
        for (const change of (payload.data as { changes: Array<{ path: string }> }).changes) validatePath(change.path, request.allowedWritePrefixes, request.stage);
      }
      return {
        schemaVersion: "1",
        runId: request.runId,
        attemptId: request.attemptId,
        stage: request.stage,
        payload: payload.data,
        provider: response.provider,
        modelId: response.modelId,
        ...(response.providerRequestId ? { providerRequestId: response.providerRequestId } : {}),
        finishReason: response.finishReason ?? "unknown",
        ...(response.usage ? { usage: response.usage } : {}),
        durationMs: Date.now() - started,
        promptTemplate: request.promptTemplate,
        contextDigest: sha256(JSON.stringify(request.context.map(({ id, digest }) => ({ id, digest })))),
        ...(response.diagnostics ? { diagnostics: response.diagnostics } : {}),
      };
    } catch (error) {
      if (error instanceof ReasoningError) throw error;
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason instanceof ReasoningError) throw reason;
        throw new ReasoningError("cancelled", "reasoning request was cancelled");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener("abort", abort);
    }
  }

  async runBudgeted(
    rawRequest: unknown,
    budget: ReasoningRunBudget,
    options: { attemptKind?: SemanticAttemptKind; estimatedCostMicros?: number; signal?: AbortSignal } = {},
  ): Promise<ReasoningResult> {
    const request = budget.reserve(rawRequest, options.attemptKind, options.estimatedCostMicros);
    const result = await this.run(request, options.signal);
    budget.record(result);
    return result;
  }
}
