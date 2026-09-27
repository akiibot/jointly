import { reasoningRequestSchema, type ReasoningRequest, type ReasoningResult } from "./contracts.js";
import { ReasoningError } from "./errors.js";

export interface ReasoningBudgetPolicy {
  maxCalls: number;
  maxSchemaCorrections: number;
  maxRepairAttempts: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxDurationMs: number;
  maxCostMicros: number;
}

export type SemanticAttemptKind = "initial" | "schema-correction" | "repair-attempt";

export interface ReasoningBudgetSnapshot {
  calls: number;
  schemaCorrections: number;
  repairAttempts: number;
  reservedInputTokens: number;
  reservedOutputTokens: number;
  observedInputTokens: number;
  observedOutputTokens: number;
  estimatedCostMicros: number;
  elapsedMs: number;
}

export const DEFAULT_REASONING_BUDGET: ReasoningBudgetPolicy = {
  maxCalls: 16,
  maxSchemaCorrections: 2,
  maxRepairAttempts: 2,
  maxInputTokens: 200_000,
  maxOutputTokens: 32_000,
  maxDurationMs: 15 * 60_000,
  maxCostMicros: 10_000_000,
};

function positiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative safe integer`);
}

export class ReasoningRunBudget {
  private readonly startedAt: number;
  private calls = 0;
  private schemaCorrections = 0;
  private repairAttempts = 0;
  private reservedInputTokens = 0;
  private reservedOutputTokens = 0;
  private observedInputTokens = 0;
  private observedOutputTokens = 0;
  private estimatedCostMicros = 0;

  constructor(
    readonly policy: ReasoningBudgetPolicy = DEFAULT_REASONING_BUDGET,
    private readonly now: () => number = Date.now,
  ) {
    for (const [name, value] of Object.entries(policy)) positiveInteger(value, name);
    this.startedAt = now();
  }

  reserve(rawRequest: unknown, kind: SemanticAttemptKind = "initial", estimatedCostMicros = 0): ReasoningRequest {
    const parsed = reasoningRequestSchema.safeParse(rawRequest);
    if (!parsed.success) throw new ReasoningError("invalid-output", `invalid reasoning request: ${parsed.error.message}`);
    positiveInteger(estimatedCostMicros, "estimatedCostMicros");
    const request = parsed.data;
    const inputTokens = Math.ceil(request.context.reduce((total, entry) => total + entry.content.length, 0) / 4);
    const next = {
      calls: this.calls + 1,
      schemaCorrections: this.schemaCorrections + (kind === "schema-correction" ? 1 : 0),
      repairAttempts: this.repairAttempts + (kind === "repair-attempt" ? 1 : 0),
      inputTokens: this.reservedInputTokens + inputTokens,
      outputTokens: this.reservedOutputTokens + request.model.maxOutputTokens,
      costMicros: this.estimatedCostMicros + estimatedCostMicros,
      elapsedMs: this.now() - this.startedAt,
    };
    if (next.calls > this.policy.maxCalls) throw new ReasoningError("budget-exhausted", "aggregate reasoning call budget is exhausted");
    if (next.schemaCorrections > this.policy.maxSchemaCorrections) throw new ReasoningError("budget-exhausted", "schema-correction retry budget is exhausted");
    if (next.repairAttempts > this.policy.maxRepairAttempts) throw new ReasoningError("budget-exhausted", "repair-attempt budget is exhausted");
    if (next.inputTokens > this.policy.maxInputTokens || next.outputTokens > this.policy.maxOutputTokens) {
      throw new ReasoningError("budget-exhausted", "aggregate reasoning token budget is exhausted");
    }
    if (next.elapsedMs >= this.policy.maxDurationMs) throw new ReasoningError("budget-exhausted", "aggregate reasoning duration budget is exhausted");
    if (next.costMicros > this.policy.maxCostMicros) throw new ReasoningError("budget-exhausted", "aggregate reasoning cost budget is exhausted");
    this.calls = next.calls;
    this.schemaCorrections = next.schemaCorrections;
    this.repairAttempts = next.repairAttempts;
    this.reservedInputTokens = next.inputTokens;
    this.reservedOutputTokens = next.outputTokens;
    this.estimatedCostMicros = next.costMicros;
    return request;
  }

  record(result: ReasoningResult): void {
    this.observedInputTokens += result.usage?.inputTokens ?? 0;
    this.observedOutputTokens += result.usage?.outputTokens ?? 0;
    if (result.usage?.estimatedCostMicros !== undefined) {
      this.estimatedCostMicros = Math.max(this.estimatedCostMicros, result.usage.estimatedCostMicros);
    }
  }

  snapshot(): ReasoningBudgetSnapshot {
    return {
      calls: this.calls,
      schemaCorrections: this.schemaCorrections,
      repairAttempts: this.repairAttempts,
      reservedInputTokens: this.reservedInputTokens,
      reservedOutputTokens: this.reservedOutputTokens,
      observedInputTokens: this.observedInputTokens,
      observedOutputTokens: this.observedOutputTokens,
      estimatedCostMicros: this.estimatedCostMicros,
      elapsedMs: this.now() - this.startedAt,
    };
  }
}
