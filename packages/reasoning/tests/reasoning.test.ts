import { describe, expect, it } from "vitest";
import {
  buildBoundedContext,
  FakeInferenceTransport,
  ReasoningEngine,
  ReasoningError,
  ReasoningRunBudget,
  reasoningTemplate,
  readWatsonxConfiguration,
  sha256,
  watsonxConfigurationPresence,
} from "../src/index.js";

function request(overrides: Record<string, unknown> = {}) {
  const content = "Requirement PAYMENT-3 must be preserved.";
  const contextDigest = sha256(content);
  const template = reasoningTemplate("propose-test");
  return {
    schemaVersion: "1",
    runId: "run-1",
    attemptId: "attempt-1",
    stage: "propose-test",
    frozenInputDigest: sha256("inputs"),
    promptTemplate: { id: template.id, version: template.version, digest: template.digest },
    context: [{ id: "intent-a", label: "Intent A", digest: contextDigest, content, classification: "prompt" }],
    model: { id: "fake-model", maxOutputTokens: 1_000, temperature: 0 },
    deadlineAt: new Date(Date.now() + 10_000).toISOString(),
    budget: { remainingCalls: 1, remainingInputTokens: 1_000, remainingOutputTokens: 1_000, remainingDurationMs: 10_000 },
    allowedRequirementIds: ["PAYMENT-3"],
    allowedWritePrefixes: ["generated-tests/"],
    ...overrides,
  };
}

function response(content: unknown, finishReason: "stop" | "length" = "stop") {
  return {
    content: typeof content === "string" ? content : JSON.stringify(content),
    provider: "fake",
    modelId: "fake-model",
    providerRequestId: "fake-1",
    finishReason,
    usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 },
  } as const;
}

function validTestPayload() {
  const input = request();
  const context = (input.context as Array<{ id: string; digest: string }>)[0]!;
  return {
    hypothesisId: "H-1",
    requirementIds: ["PAYMENT-3"],
    path: "generated-tests/coupon-payment.test.ts",
    content: "it('replays', () => expect(true).toBe(true));",
    expected: "same-key replay returns the original payment",
    citations: [{ contextId: context.id, digest: context.digest }],
  };
}

describe("provider-independent reasoning", () => {
  it("validates a bounded fake response and records reproducibility metadata", async () => {
    const transport = new FakeInferenceTransport([response(validTestPayload())]);
    const result = await new ReasoningEngine(transport).run(request());
    expect(result).toMatchObject({
      schemaVersion: "1",
      stage: "propose-test",
      provider: "fake",
      modelId: "fake-model",
      providerRequestId: "fake-1",
      finishReason: "stop",
    });
    expect(result.contextDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects bad JSON, truncation, hallucinated requirements, and forbidden paths", async () => {
    await expect(new ReasoningEngine(new FakeInferenceTransport([response("{")])).run(request())).rejects.toMatchObject({ code: "invalid-output" });
    await expect(new ReasoningEngine(new FakeInferenceTransport([response(validTestPayload(), "length")])).run(request())).rejects.toMatchObject({ code: "invalid-output" });
    await expect(new ReasoningEngine(new FakeInferenceTransport([response({ ...validTestPayload(), requirementIds: ["FAKE-9"] })])).run(request())).rejects.toThrow("unknown requirement");
    await expect(new ReasoningEngine(new FakeInferenceTransport([response({ ...validTestPayload(), path: "../existing.test.ts" })])).run(request())).rejects.toThrow("escapes");
  });

  it("enforces token budgets and cancellation without retrying", async () => {
    await expect(new ReasoningEngine(new FakeInferenceTransport([response(validTestPayload())])).run(request({
      budget: { remainingCalls: 1, remainingInputTokens: 1, remainingOutputTokens: 1_000, remainingDurationMs: 10_000 },
    }))).rejects.toMatchObject({ code: "budget-exhausted" });
    const controller = new AbortController();
    const transport = new FakeInferenceTransport([async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return response(validTestPayload());
    }]);
    const pending = new ReasoningEngine(transport).run(request(), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "cancelled" });
    expect(transport.requests).toHaveLength(1);
  });

  it("redacts secret-shaped context, excludes oracle answers, and records overflow", () => {
    const built = buildBoundedContext([
      { id: "source", label: "source", content: "WATSONX_API_KEY=secret-value\nconst ok = true", classification: "source" },
      { id: "oracle", label: "expected answer", content: "the hidden fix", classification: "oracle" },
      { id: "large", label: "large", content: "x".repeat(1_000), classification: "diff" },
    ], 100);
    expect(built.included[0]?.content).toContain("[REDACTED_SECRET]");
    expect(built.included[0]?.content).not.toContain("secret-value");
    expect(built.omissions).toEqual(expect.arrayContaining([
      { id: "oracle", reason: "oracle context is forbidden" },
      { id: "large", reason: "context byte budget exceeded" },
    ]));
  });

  it("validates configuration aliases without exposing values", () => {
    const environment = {
      WATSONX_API_KEY: "secret",
      WATSONX_SERVICE_URL: "https://example.invalid",
      WATSONX_PROJECT_ID: "project",
      WATSONX_MODEL_ID: "model",
      WATSONX_API_VERSION: "2026-09-27",
    };
    expect(readWatsonxConfiguration(environment).modelId).toBe("model");
    const presence = watsonxConfigurationPresence(environment);
    expect(presence.missingNames).toEqual([]);
    expect(JSON.stringify(presence)).not.toContain("secret");
    expect(() => readWatsonxConfiguration({})).toThrow("WATSONX_API_KEY");
  });

  it("preserves normalized provider errors for bounded retry policy", async () => {
    const error = new ReasoningError("rate-limit", "rate limited", true, 500);
    await expect(new ReasoningEngine(new FakeInferenceTransport([error])).run(request())).rejects.toBe(error);
  });

  it("enforces aggregate call, retry, token, duration, and cost ceilings", async () => {
    let now = 1_000;
    const policy = {
      maxCalls: 3, maxSchemaCorrections: 1, maxRepairAttempts: 1,
      maxInputTokens: 1_000, maxOutputTokens: 3_000, maxDurationMs: 100, maxCostMicros: 30,
    };
    const budget = new ReasoningRunBudget(policy, () => now);
    const engine = new ReasoningEngine(new FakeInferenceTransport([
      response(validTestPayload()), response(validTestPayload()), response(validTestPayload()),
    ]));
    await engine.runBudgeted(request(), budget, { estimatedCostMicros: 10 });
    await engine.runBudgeted(request({ attemptId: "attempt-2" }), budget, { attemptKind: "schema-correction", estimatedCostMicros: 10 });
    await expect(engine.runBudgeted(request({ attemptId: "attempt-3" }), budget, { attemptKind: "schema-correction" }))
      .rejects.toMatchObject({ code: "budget-exhausted" });
    await engine.runBudgeted(request({ attemptId: "attempt-4" }), budget, { attemptKind: "repair-attempt", estimatedCostMicros: 10 });
    await expect(engine.runBudgeted(request({ attemptId: "attempt-5" }), budget)).rejects.toMatchObject({ code: "budget-exhausted" });
    expect(budget.snapshot()).toMatchObject({ calls: 3, schemaCorrections: 1, repairAttempts: 1, estimatedCostMicros: 30 });

    const costBudget = new ReasoningRunBudget({ ...policy, maxCalls: 4 });
    expect(() => costBudget.reserve(request(), "initial", 31)).toThrow("cost budget");
    const durationBudget = new ReasoningRunBudget({ ...policy, maxCalls: 4 }, () => now);
    now = 1_101;
    expect(() => durationBudget.reserve(request({ attemptId: "late" }))).toThrow("duration budget");
  });
});
