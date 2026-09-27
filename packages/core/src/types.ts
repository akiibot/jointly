export type WorkspaceName = "base" | "change-a" | "change-b" | "combined" | "repaired";

export interface RunCommands {
  install?: string;
  build?: string;
  test: string;
  testReport?: string;
  interactionTest?: string;
  interactionTestReport?: string;
}

export interface StabilityConfig {
  iterations: number;
  concurrency: number;
  seed: number;
}

export interface ChangePackage {
  id: string;
  ref: string;
  resolvedCommit: string;
  resolvedTree?: string;
  promptPath: string;
  promptDigest?: string;
  diffArtifact?: string;
}

export interface RunManifest {
  schemaVersion?: "2";
  runId: string;
  createdAt: string;
  repositoryRoot: string;
  baseRef: string;
  resolvedBaseCommit: string;
  resolvedBaseTree?: string;
  changes: ChangePackage[];
  commands: RunCommands;
  stability?: StabilityConfig;
  configSnapshot?: JointlyConfig;
  configDigest?: string;
}

export type RequirementType =
  | "business-rule"
  | "invariant"
  | "negative-case"
  | "security"
  | "compatibility";

export interface IntentRequirement {
  id: string;
  statement: string;
  type: RequirementType;
  entities: string[];
  sideEffects: string[];
  observableOutcome: string;
  source: { file: string; excerpt: string };
  assumptions?: string[];
}

export interface IntentContract {
  changeId: string;
  goal: string;
  requirements: IntentRequirement[];
  entities: string[];
  sideEffects: string[];
  ambiguities: string[];
}

export interface InteractionSurface {
  kind:
    | "file"
    | "symbol"
    | "api"
    | "database"
    | "event"
    | "state"
    | "side-effect"
    | "domain-concept";
  identifier: string;
  changeIds: string[];
  evidence: string[];
}

export interface CollisionHypothesis {
  id: string;
  changeIds: string[];
  requirementIds: string[];
  sharedSurface: string[];
  explanation: string;
  risk: "low" | "medium" | "high";
  scenario: string[];
  conflictingRequirementIds?: string[];
}

export interface RequirementResolution {
  schemaVersion: "1";
  id: string;
  conflictingRequirementIds: string[];
  originalStatements: Array<{ requirementId: string; statement: string }>;
  decision: "accepted-replacement" | "preserve-both" | "unresolved";
  proposedReplacement?: string;
  rationale: string;
  authority?: {
    kind: "operator" | "precedence-rule";
    source: string;
  };
  affectedTests: string[];
  createdAt: string;
}

export interface CommandResult {
  commandId: string;
  workspace: WorkspaceName;
  command: string;
  exitCode: number | null;
  timedOut: boolean;
  signal?: NodeJS.Signals | null;
  terminationReason?: "exit" | "timeout" | "signal" | "cancelled" | "spawn-error";
  durationMs: number;
  stdoutArtifact: string;
  stderrArtifact: string;
  environmentPolicy?: {
    version: string;
    inheritedNames: string[];
    explicitNames: string[];
  };
  testCounts?: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    todo: number;
  };
  testReportArtifact?: string;
  testReportError?: string;
}

export interface ExecutionFingerprint {
  schemaVersion: "1";
  runId: string;
  baseCommit: string;
  baseTree?: string;
  changes: Array<{
    id: string;
    commit: string;
    tree?: string;
    promptDigest?: string;
  }>;
  configDigest?: string;
  workspace: WorkspaceName;
  workspaceCommit?: string;
  workspaceTree?: string;
  workspaceStateDigest?: string;
  commandDigest: string;
  environmentPolicyDigest?: string;
  testSourceDigest?: string;
  testReportDigest?: string;
  intentContractsDigest?: string;
  hypothesesDigest?: string;
  requirementResolutionsDigest?: string;
  repairCandidateDigest?: string;
  inputsDigest: string;
}

export interface CollisionEvidence {
  hypothesisId: string;
  classification:
    | "confirmed-collision"
    | "hypothesis-rejected"
    | "test-invalid"
    | "environment-failure"
    | "insufficient-evidence";
  requirementIds: string[];
  testFile: string;
  executedTestArtifact?: string;
  executedTestDigest?: string;
  commandResult: CommandResult;
  expected: string;
  observed: string;
  classificationReason?: string;
  testCounts?: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    todo: number;
  };
}

export interface StabilityResult {
  schemaVersion: "2";
  scenario: string;
  processIterations: number;
  workerConcurrency: number;
  requestConcurrency: number | null;
  baseSeed: number;
  seedStrategy: "base-plus-iteration-minus-one";
  iterations: number;
  passed: number;
  failed: number;
  seed: number;
  concurrency: number;
  failedIterations: Array<{ iteration: number; evidenceArtifact: string }>;
  executions: Array<{
    iteration: number;
    executionArtifact: string;
    inputs: ExecutionFingerprint;
  }>;
  iterationResults: Array<{
    iteration: number;
    scenario: string;
    seed: number;
    outcome: "passed" | "failed" | "timed-out";
    exitCode: number | null;
    timedOut: boolean;
    durationMs: number;
    stdoutArtifact: string;
    stderrArtifact: string;
    executionArtifact?: string;
    inputs?: ExecutionFingerprint;
  }>;
}

export const PASSPORT_VERDICTS = [
  "SAFE_TO_MERGE",
  "COLLISION_CONFIRMED",
  "REPAIR_REQUIRES_REVIEW",
  "INDEPENDENT_CHANGE_FAILED",
  "TEXTUAL_CONFLICT",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type PassportVerdict = (typeof PASSPORT_VERDICTS)[number];

export interface JointlyConfig {
  project: { name: string; root: string };
  base: { ref: string };
  changes: Array<{ id: string; ref: string; promptFile: string }>;
  commands: RunCommands;
  stability?: StabilityConfig;
}

export interface WorkspaceRecord {
  name: Exclude<WorkspaceName, "repaired">;
  path: string;
  commit: string;
}

export interface WorkspacePreparation {
  workspaces: WorkspaceRecord[];
  textualConflict: null | { changeId: string; message: string; files: string[] };
}
