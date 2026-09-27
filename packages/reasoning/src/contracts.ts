import { createHash } from "node:crypto";
import { z } from "zod";

export const REASONING_STAGES = [
  "extract-intent",
  "discover-interactions",
  "propose-test",
  "diagnose",
  "propose-repair",
  "review-repair",
  "draft-report",
] as const;
export type ReasoningStage = (typeof REASONING_STAGES)[number];

const nonEmpty = z.string().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const citation = z.object({ contextId: nonEmpty, digest }).strict();
const rationale = z.string().min(1).max(2_000);

const requirement = z.object({
  id: nonEmpty,
  statement: nonEmpty,
  type: z.enum(["business-rule", "invariant", "negative-case", "security", "compatibility"]),
  entities: z.array(nonEmpty),
  sideEffects: z.array(nonEmpty),
  observableOutcome: nonEmpty,
  source: citation,
  assumptions: z.array(nonEmpty).optional(),
}).strict();

const intentPayload = z.object({
  changeId: nonEmpty,
  goal: nonEmpty,
  requirements: z.array(requirement).min(1),
  entities: z.array(nonEmpty),
  sideEffects: z.array(nonEmpty),
  ambiguities: z.array(nonEmpty),
}).strict().superRefine((value, context) => {
  const ids = value.requirements.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "requirement IDs must be unique" });
});

const interactionPayload = z.object({
  hypotheses: z.array(z.object({
    id: nonEmpty,
    changeIds: z.array(nonEmpty).length(2),
    requirementIds: z.array(nonEmpty).min(1),
    sharedSurface: z.array(nonEmpty).min(1),
    explanation: rationale,
    risk: z.enum(["low", "medium", "high"]),
    scenario: z.array(nonEmpty).min(1),
    citations: z.array(citation).min(1),
    conflictingRequirementIds: z.array(nonEmpty).optional(),
  }).strict()).max(2),
}).strict().superRefine((value, context) => {
  const ids = value.hypotheses.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "hypothesis IDs must be unique" });
});

const testPayload = z.object({
  hypothesisId: nonEmpty,
  requirementIds: z.array(nonEmpty).min(1),
  path: nonEmpty,
  content: z.string().min(1).max(64 * 1024),
  expected: nonEmpty,
  citations: z.array(citation).min(1),
}).strict();

const diagnosisPayload = z.object({
  hypothesisId: nonEmpty,
  interpretation: rationale,
  implicatedRequirementIds: z.array(nonEmpty).min(1),
  proposedResolution: z.object({
    conflictingRequirementIds: z.array(nonEmpty).min(1),
    proposedReplacement: nonEmpty,
    rationale,
  }).strict().optional(),
  citations: z.array(citation).min(1),
}).strict();

const fileChange = z.object({
  path: nonEmpty,
  expectedPriorDigest: z.union([digest, z.literal("NEW_FILE")]),
  content: z.string().max(128 * 1024),
  rationale,
}).strict();

const repairPayload = z.object({
  changes: z.array(fileChange).min(1).max(8),
  preservedRequirementIds: z.array(nonEmpty).min(1),
  revisedRequirementIds: z.array(nonEmpty),
  rationale,
  citations: z.array(citation).min(1),
}).strict();

const reviewPayload = z.object({
  recommendation: z.enum(["review", "revise"]),
  risks: z.array(z.object({ severity: z.enum(["low", "medium", "high"]), statement: nonEmpty, evidenceArtifact: nonEmpty }).strict()),
  testPreservationConcerns: z.array(nonEmpty),
  summary: rationale,
}).strict();

const reportPayload = z.object({
  title: nonEmpty,
  summary: rationale,
  evidenceArtifacts: z.array(nonEmpty).min(1),
  limitations: z.array(nonEmpty),
}).strict();

export const stagePayloadSchemas = {
  "extract-intent": intentPayload,
  "discover-interactions": interactionPayload,
  "propose-test": testPayload,
  diagnose: diagnosisPayload,
  "propose-repair": repairPayload,
  "review-repair": reviewPayload,
  "draft-report": reportPayload,
} satisfies Record<ReasoningStage, z.ZodType>;

export const reasoningRequestSchema = z.object({
  schemaVersion: z.literal("1"),
  runId: nonEmpty,
  attemptId: nonEmpty,
  stage: z.enum(REASONING_STAGES),
  frozenInputDigest: digest,
  promptTemplate: z.object({ id: nonEmpty, version: nonEmpty, digest }).strict(),
  context: z.array(z.object({
    id: nonEmpty,
    label: nonEmpty,
    digest,
    content: z.string(),
    classification: z.enum(["prompt", "source", "diff", "evidence", "policy"]),
  }).strict()).max(64),
  model: z.object({ id: nonEmpty, maxOutputTokens: z.number().int().positive().max(16_384), temperature: z.number().min(0).max(2).optional() }).strict(),
  deadlineAt: z.iso.datetime(),
  budget: z.object({
    remainingCalls: z.number().int().positive(),
    remainingInputTokens: z.number().int().positive(),
    remainingOutputTokens: z.number().int().positive(),
    remainingDurationMs: z.number().int().positive(),
    remainingCostMicros: z.number().int().nonnegative().optional(),
  }).strict(),
  allowedRequirementIds: z.array(nonEmpty),
  allowedWritePrefixes: z.array(nonEmpty),
}).strict();

export type ReasoningRequest = z.infer<typeof reasoningRequestSchema>;

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostMicros?: number;
}

export interface RawInferenceResponse {
  content: string;
  provider: string;
  modelId: string;
  providerRequestId?: string;
  finishReason?: "stop" | "length" | "refusal" | "content-filter" | "unknown";
  usage?: ProviderUsage;
  diagnostics?: Record<string, string | number | boolean | null>;
}

export interface RawInferenceChunk {
  contentDelta: string;
  providerRequestId?: string;
  finishReason?: RawInferenceResponse["finishReason"];
  usage?: ProviderUsage;
}

export interface InferenceTransport {
  readonly provider: string;
  infer(request: ReasoningRequest, signal: AbortSignal): Promise<RawInferenceResponse>;
  stream?(request: ReasoningRequest, signal: AbortSignal): AsyncIterable<RawInferenceChunk>;
}

export interface ReasoningResult {
  schemaVersion: "1";
  runId: string;
  attemptId: string;
  stage: ReasoningStage;
  payload: unknown;
  provider: string;
  modelId: string;
  providerRequestId?: string;
  finishReason: NonNullable<RawInferenceResponse["finishReason"]>;
  usage?: ProviderUsage;
  durationMs: number;
  promptTemplate: ReasoningRequest["promptTemplate"];
  contextDigest: string;
  diagnostics?: RawInferenceResponse["diagnostics"];
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
