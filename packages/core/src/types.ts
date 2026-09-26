export type WorkspaceName = "base" | "change-a" | "change-b" | "combined" | "repaired";

export interface RunCommands {
  install?: string;
  build?: string;
  test: string;
  interactionTest?: string;
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
  promptPath: string;
  diffArtifact?: string;
}

export interface RunManifest {
  runId: string;
  createdAt: string;
  repositoryRoot: string;
  baseRef: string;
  resolvedBaseCommit: string;
  changes: ChangePackage[];
  commands: RunCommands;
  stability?: StabilityConfig;
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
}

export interface CommandResult {
  commandId: string;
  workspace: WorkspaceName;
  command: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  stdoutArtifact: string;
  stderrArtifact: string;
}

export interface CollisionEvidence {
  hypothesisId: string;
  classification:
    | "confirmed-collision"
    | "hypothesis-rejected"
    | "test-invalid"
    | "environment-failure";
  requirementIds: string[];
  testFile: string;
  commandResult: CommandResult;
  expected: string;
  observed: string;
}

export interface StabilityResult {
  iterations: number;
  passed: number;
  failed: number;
  seed: number;
  concurrency: number;
  failedIterations: Array<{ iteration: number; evidenceArtifact: string }>;
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
