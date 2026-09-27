import { z } from "zod";
import type { RunManifest } from "./types.js";

const nonEmpty = z.string().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const testCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  todo: z.number().int().nonnegative(),
}).strict();

export const runCommandsSchema = z.object({
  install: nonEmpty.optional(),
  build: nonEmpty.optional(),
  test: nonEmpty,
  testReport: nonEmpty.optional(),
  interactionTest: nonEmpty.optional(),
  interactionTestReport: nonEmpty.optional(),
}).strict();

export const stabilityConfigSchema = z.object({
  iterations: z.number().int().positive(),
  concurrency: z.number().int().positive(),
  seed: z.number().int(),
}).strict();

export const jointlyConfigSchema = z.object({
  project: z.object({ name: nonEmpty, root: nonEmpty }).strict(),
  base: z.object({ ref: nonEmpty }).strict(),
  changes: z.array(z.object({ id: nonEmpty, ref: nonEmpty, promptFile: nonEmpty }).strict()).length(2),
  commands: runCommandsSchema,
  stability: stabilityConfigSchema.optional(),
}).strict();

const changePackageSchema = z.object({
  id: nonEmpty,
  ref: nonEmpty,
  resolvedCommit: nonEmpty,
  resolvedTree: nonEmpty.optional(),
  promptPath: nonEmpty,
  promptDigest: digest.optional(),
  diffArtifact: nonEmpty.optional(),
}).strict();

const manifestFields = {
  runId: nonEmpty,
  createdAt: z.iso.datetime(),
  repositoryRoot: nonEmpty,
  baseRef: nonEmpty,
  resolvedBaseCommit: nonEmpty,
  resolvedBaseTree: nonEmpty.optional(),
  changes: z.array(changePackageSchema).length(2),
  commands: runCommandsSchema,
  stability: stabilityConfigSchema.optional(),
  configSnapshot: jointlyConfigSchema.optional(),
  configDigest: digest.optional(),
};

export const runManifestV2Schema = z.object({ schemaVersion: z.literal("2"), ...manifestFields }).strict();
export const legacyRunManifestSchema = z.object({ schemaVersion: z.undefined().optional(), ...manifestFields }).strict();

export interface ImportedRunManifest {
  value: RunManifest;
  importStatus: "current" | "legacy-read-only";
}

export function parseRunManifestArtifact(value: unknown): ImportedRunManifest {
  const current = runManifestV2Schema.safeParse(value);
  if (current.success) return { value: current.data, importStatus: "current" };
  const legacy = legacyRunManifestSchema.safeParse(value);
  if (legacy.success) return { value: legacy.data, importStatus: "legacy-read-only" };
  throw new Error(`invalid manifest.json: ${z.prettifyError(current.error)}`);
}

export const commandResultSchema = z.object({
  commandId: nonEmpty,
  workspace: z.enum(["base", "change-a", "change-b", "combined", "repaired"]),
  command: nonEmpty,
  exitCode: z.number().int().nullable(),
  timedOut: z.boolean(),
  signal: z.string().nullable().optional(),
  terminationReason: z.enum(["exit", "timeout", "signal", "cancelled", "spawn-error"]).optional(),
  durationMs: z.number().nonnegative(),
  stdoutArtifact: nonEmpty,
  stderrArtifact: nonEmpty,
  environmentPolicy: z.object({
    version: nonEmpty,
    inheritedNames: z.array(nonEmpty),
    explicitNames: z.array(nonEmpty),
  }).strict().optional(),
  testCounts: testCountsSchema.optional(),
  testReportArtifact: nonEmpty.optional(),
  testReportError: nonEmpty.optional(),
}).strict();

export const intentRequirementSchema = z.object({
  id: nonEmpty,
  statement: nonEmpty,
  type: z.enum(["business-rule", "invariant", "negative-case", "security", "compatibility"]),
  entities: z.array(nonEmpty),
  sideEffects: z.array(nonEmpty),
  observableOutcome: nonEmpty,
  source: z.object({ file: nonEmpty, excerpt: nonEmpty }).strict(),
  assumptions: z.array(nonEmpty).optional(),
}).strict();

export const intentContractSchema = z.object({
  changeId: nonEmpty,
  goal: nonEmpty,
  requirements: z.array(intentRequirementSchema).min(1),
  entities: z.array(nonEmpty),
  sideEffects: z.array(nonEmpty),
  ambiguities: z.array(nonEmpty),
}).strict();

export const collisionHypothesisSchema = z.object({
  id: nonEmpty,
  changeIds: z.array(nonEmpty).length(2),
  requirementIds: z.array(nonEmpty).min(1),
  sharedSurface: z.array(nonEmpty).min(1),
  explanation: nonEmpty,
  risk: z.enum(["low", "medium", "high"]),
  scenario: z.array(nonEmpty).min(1),
  conflictingRequirementIds: z.array(nonEmpty).optional(),
}).strict();

export const hypothesesArtifactSchema = z.union([
  z.array(collisionHypothesisSchema),
  z.object({ schemaVersion: z.literal("1"), hypotheses: z.array(collisionHypothesisSchema) }).strict(),
]);

export const requirementResolutionSchema = z.object({
  schemaVersion: z.literal("1"),
  id: nonEmpty,
  conflictingRequirementIds: z.array(nonEmpty).min(1),
  originalStatements: z.array(z.object({ requirementId: nonEmpty, statement: nonEmpty }).strict()).min(1),
  decision: z.enum(["accepted-replacement", "preserve-both", "unresolved"]),
  proposedReplacement: nonEmpty.optional(),
  rationale: nonEmpty,
  authority: z.object({ kind: z.enum(["operator", "precedence-rule"]), source: nonEmpty }).strict().optional(),
  affectedTests: z.array(nonEmpty),
  createdAt: z.iso.datetime(),
}).strict().superRefine((value, context) => {
  if (value.decision === "accepted-replacement" && !value.proposedReplacement) {
    context.addIssue({ code: "custom", message: "accepted-replacement requires proposedReplacement" });
  }
  if (value.decision !== "unresolved" && !value.authority) {
    context.addIssue({ code: "custom", message: "resolved decisions require authority" });
  }
});

export const requirementResolutionsArtifactSchema = z.array(requirementResolutionSchema);

export const collisionEvidenceSchema = z.object({
  hypothesisId: nonEmpty,
  classification: z.enum([
    "confirmed-collision",
    "hypothesis-rejected",
    "test-invalid",
    "environment-failure",
    "insufficient-evidence",
  ]),
  requirementIds: z.array(nonEmpty).min(1),
  testFile: nonEmpty,
  executedTestArtifact: nonEmpty.optional(),
  executedTestDigest: digest.optional(),
  commandResult: commandResultSchema,
  expected: nonEmpty,
  observed: nonEmpty,
  classificationReason: nonEmpty.optional(),
  testCounts: testCountsSchema.optional(),
}).strict();

export const runtimeDiagnosisSchema = z.object({
  schemaVersion: z.literal("1"),
  hypothesisId: nonEmpty,
  requirementIds: z.array(nonEmpty).min(1),
  interpretation: z.string().min(1).max(2_000),
  evidenceArtifact: z.literal("collision-evidence.before-repair.json"),
  citations: z.array(z.object({ artifact: nonEmpty, digest }).strict()).min(1),
}).strict();

export const repairReviewSchema = z.object({
  schemaVersion: z.literal("1"),
  recommendation: z.enum(["approve", "revise"]),
  repairDigest: digest,
  generatedTestDigest: digest,
  verificationContextDigest: digest,
  reviewedFiles: z.array(nonEmpty).min(1),
  testPreservationConcerns: z.array(nonEmpty),
  summary: z.string().min(1).max(2_000),
}).strict();

export const stabilityResultSchema = z.object({
  schemaVersion: z.literal("2"),
  scenario: nonEmpty,
  processIterations: z.number().int().positive(),
  workerConcurrency: z.number().int().positive(),
  requestConcurrency: z.number().int().positive().nullable(),
  baseSeed: z.number().int(),
  seedStrategy: z.literal("base-plus-iteration-minus-one"),
  iterations: z.number().int().positive(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  seed: z.number().int(),
  concurrency: z.number().int().positive(),
  failedIterations: z.array(z.object({ iteration: z.number().int().positive(), evidenceArtifact: nonEmpty }).strict()),
  executions: z.array(z.object({
    iteration: z.number().int().positive(),
    executionArtifact: nonEmpty,
    inputs: z.lazy(() => executionFingerprintSchema),
  }).strict()),
  iterationResults: z.array(z.object({
    iteration: z.number().int().positive(),
    scenario: nonEmpty,
    seed: z.number().int(),
    outcome: z.enum(["passed", "failed", "timed-out"]),
    exitCode: z.number().int().nullable(),
    timedOut: z.boolean(),
    durationMs: z.number().int().nonnegative(),
    stdoutArtifact: nonEmpty,
    stderrArtifact: nonEmpty,
    executionArtifact: nonEmpty.optional(),
    inputs: z.lazy(() => executionFingerprintSchema).optional(),
  }).strict()),
}).strict().superRefine((value, context) => {
  if (value.processIterations !== value.iterations) context.addIssue({ code: "custom", message: "processIterations must equal iterations" });
  if (value.workerConcurrency !== value.concurrency) context.addIssue({ code: "custom", message: "workerConcurrency must equal concurrency" });
  if (value.passed + value.failed !== value.iterations) context.addIssue({ code: "custom", message: "passed plus failed must equal iterations" });
  if (value.iterationResults.length !== value.iterations) context.addIssue({ code: "custom", message: "every iteration requires a result" });
  value.iterationResults.forEach((result, index) => {
    if (result.iteration !== index + 1) context.addIssue({ code: "custom", message: "iteration results must be ordered and contiguous" });
    if (result.scenario !== value.scenario) context.addIssue({ code: "custom", message: "iteration scenario must match report scenario" });
    if (result.seed !== value.baseSeed + index) context.addIssue({ code: "custom", message: "iteration seed does not match the declared strategy" });
  });
});

const failureScenarioIdSchema = z.enum([
  "textual-conflict",
  "independent-failure",
  "invalid-test",
  "timeout",
  "cancellation",
]);

const failureScenarioOutcomeSchema = z.enum([
  "TEXTUAL_CONFLICT",
  "INDEPENDENT_CHANGE_FAILED",
  "test-invalid",
  "environment-failure",
  "cancelled",
]);

export const failureScenarioReportSchema = z.object({
  schemaVersion: z.literal("1"),
  scenarioSet: z.literal("w7-failure-modes"),
  cases: z.array(z.object({
    id: failureScenarioIdSchema,
    outcome: failureScenarioOutcomeSchema,
    reason: nonEmpty,
    actualExecution: z.literal(true),
    commandResult: commandResultSchema,
    classification: z.enum([
      "confirmed-collision",
      "hypothesis-rejected",
      "test-invalid",
      "environment-failure",
      "insufficient-evidence",
    ]).optional(),
    conflictedFiles: z.array(nonEmpty).optional(),
  }).strict()).length(5),
}).strict().superRefine((value, context) => {
  const expected = new Map([
    ["textual-conflict", "TEXTUAL_CONFLICT"],
    ["independent-failure", "INDEPENDENT_CHANGE_FAILED"],
    ["invalid-test", "test-invalid"],
    ["timeout", "environment-failure"],
    ["cancellation", "cancelled"],
  ]);
  const ids = new Set(value.cases.map((entry) => entry.id));
  if (ids.size !== expected.size || [...expected.keys()].some((id) => !ids.has(id as never))) {
    context.addIssue({ code: "custom", message: "failure report must contain every required scenario exactly once" });
  }
  for (const entry of value.cases) {
    if (entry.outcome !== expected.get(entry.id)) context.addIssue({ code: "custom", message: `${entry.id} has the wrong outcome` });
    if (entry.id === "textual-conflict" && (!entry.conflictedFiles || entry.conflictedFiles.length === 0)) {
      context.addIssue({ code: "custom", message: "textual conflict requires conflicted files" });
    }
    if (["invalid-test", "timeout", "cancellation"].includes(entry.id) && !entry.classification) {
      context.addIssue({ code: "custom", message: `${entry.id} requires a classification` });
    }
  }
});

const workspaceResultsSchema = z.object({
  base: commandResultSchema.optional(),
  "change-a": commandResultSchema.optional(),
  "change-b": commandResultSchema.optional(),
  combined: commandResultSchema.optional(),
}).strict();

export const existingTestSummarySchema = z.object({
  schemaVersion: z.literal("2"),
  beforeRepair: workspaceResultsSchema,
  afterRepair: workspaceResultsSchema,
  fingerprints: z.object({
    beforeRepair: z.partialRecord(z.enum(["base", "change-a", "change-b", "combined"]), z.lazy(() => executionFingerprintSchema)),
    afterRepair: z.partialRecord(z.enum(["base", "change-a", "change-b", "combined"]), z.lazy(() => executionFingerprintSchema)),
  }).strict(),
}).strict();

export const legacyExistingTestSummarySchema = z.object({
  schemaVersion: z.literal("1"),
  beforeRepair: workspaceResultsSchema,
  afterRepair: workspaceResultsSchema,
}).strict();
export const existingTestSummaryArtifactSchema = z.union([
  existingTestSummarySchema,
  legacyExistingTestSummarySchema,
]);

export function parseExistingTestSummaryArtifact(value: unknown) {
  const current = existingTestSummarySchema.safeParse(value);
  if (current.success) return { value: current.data, importStatus: "current" as const };
  const legacy = legacyExistingTestSummarySchema.safeParse(value);
  if (legacy.success) {
    return {
      value: {
        schemaVersion: "2" as const,
        beforeRepair: legacy.data.beforeRepair,
        afterRepair: legacy.data.afterRepair,
        fingerprints: { beforeRepair: {}, afterRepair: {} },
      },
      importStatus: "legacy-unverified" as const,
    };
  }
  throw new Error(`invalid existing-test summary: ${z.prettifyError(current.error)}`);
}

export const executionFingerprintSchema = z.object({
  schemaVersion: z.literal("1"),
  runId: nonEmpty,
  baseCommit: nonEmpty,
  baseTree: nonEmpty.optional(),
  changes: z.array(z.object({
    id: nonEmpty,
    commit: nonEmpty,
    tree: nonEmpty.optional(),
    promptDigest: digest.optional(),
  }).strict()).length(2),
  configDigest: digest.optional(),
  workspace: z.enum(["base", "change-a", "change-b", "combined", "repaired"]),
  workspaceCommit: nonEmpty.optional(),
  workspaceTree: nonEmpty.optional(),
  workspaceStateDigest: digest.optional(),
  commandDigest: digest,
  environmentPolicyDigest: digest.optional(),
  testSourceDigest: digest.optional(),
  testReportDigest: digest.optional(),
  intentContractsDigest: digest.optional(),
  hypothesesDigest: digest.optional(),
  requirementResolutionsDigest: digest.optional(),
  repairCandidateDigest: digest.optional(),
  inputsDigest: digest,
}).strict();

export const executionRecordSchema = z.object({
  schemaVersion: z.literal("2"),
  executionId: nonEmpty,
  stage: z.enum(["build", "existing-test", "generated-test", "stability"]),
  recordedAt: z.iso.datetime(),
  inputs: executionFingerprintSchema,
  result: commandResultSchema,
}).strict();

export const legacyExecutionRecordSchema = z.object({
  schemaVersion: z.literal("1"),
  executionId: nonEmpty,
  stage: z.enum(["build", "existing-test", "generated-test", "stability"]),
  recordedAt: z.iso.datetime(),
  result: commandResultSchema,
}).strict();

export function parseExecutionRecordArtifact(value: unknown) {
  const current = executionRecordSchema.safeParse(value);
  if (current.success) return { value: current.data, importStatus: "current" as const };
  const legacy = legacyExecutionRecordSchema.safeParse(value);
  if (legacy.success) return { value: legacy.data, importStatus: "legacy-unverified" as const };
  throw new Error(`invalid execution record: ${z.prettifyError(current.error)}`);
}

export const repairMetadataSchema = z.object({
  schemaVersion: z.literal("1"),
  patchDigest: digest,
  productionFiles: z.array(nonEmpty),
  regressionTestFiles: z.array(nonEmpty),
  sourceInputIntegrity: z.object({ valid: z.boolean(), checks: z.array(z.unknown()).optional() }).passthrough(),
}).passthrough();

export const evidenceSummarySchema = z.object({
  schemaVersion: z.literal("1"),
  runId: nonEmpty,
  phase: z.enum(["registered", "investigation", "verification", "passport"]),
  verificationBasis: z.enum(["repaired-collision", "compatible-pair"]),
  artifacts: z.array(z.object({ artifact: nonEmpty, exists: z.boolean(), valid: z.boolean().optional(), error: nonEmpty.optional() }).strict()),
  requirementLinks: z.array(z.object({ requirementId: nonEmpty, artifact: nonEmpty }).strict()),
  missingRequired: z.array(nonEmpty),
  invalidRequired: z.array(nonEmpty).optional(),
}).strict();

export type ArtifactSchema<T> = z.ZodType<T>;
