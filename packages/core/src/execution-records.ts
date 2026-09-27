import { readFile } from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson } from "./evidence.js";
import { parseExistingTestSummaryArtifact } from "./schemas.js";
import { sha256 } from "./manifest.js";
import { resolveTree, runGit } from "./git.js";
import type { CommandResult, ExecutionFingerprint, RunManifest, WorkspaceName } from "./types.js";

type ExistingWorkspace = Exclude<WorkspaceName, "repaired">;
export type ExistingTestEvidenceLabel = "before-repair" | "after-repair";

export interface ExecutionRecord {
  schemaVersion: "2";
  executionId: string;
  stage: "build" | "existing-test" | "generated-test" | "stability";
  recordedAt: string;
  inputs: ExecutionFingerprint;
  result: CommandResult;
}

export interface ExistingTestSummary {
  schemaVersion: "2";
  beforeRepair: Partial<Record<ExistingWorkspace, CommandResult>>;
  afterRepair: Partial<Record<ExistingWorkspace, CommandResult>>;
  fingerprints: {
    beforeRepair: Partial<Record<ExistingWorkspace, ExecutionFingerprint>>;
    afterRepair: Partial<Record<ExistingWorkspace, ExecutionFingerprint>>;
  };
}

export interface ExecutionBinding {
  manifest: RunManifest;
  workspaceCommit?: string;
  workspaceTree?: string;
  workspacePath?: string;
  testSourceDigest?: string;
}

export async function computeWorkspaceStateDigest(workspacePath: string): Promise<string> {
  const [status, diff] = await Promise.all([
    runGit(workspacePath, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    runGit(workspacePath, ["diff", "--binary", "HEAD", "--"]),
  ]);
  if (status.exitCode !== 0 || diff.exitCode !== 0) {
    throw new Error(status.stderr || diff.stderr || "unable to fingerprint workspace state");
  }
  const untrackedPaths = status.stdout
    .split("\0")
    .filter((entry) => entry.startsWith("?? "))
    .map((entry) => entry.slice(3))
    .sort();
  const untracked = await Promise.all(untrackedPaths.map(async (relativePath) => ({
    path: relativePath,
    digest: sha256(await readFile(path.join(workspacePath, relativePath))),
  })));
  return sha256(JSON.stringify({ status: status.stdout, diff: diff.stdout, untracked }));
}

async function optionalArtifactDigest(runRoot: string, relativePath: string | undefined): Promise<string | undefined> {
  if (!relativePath) return undefined;
  try {
    return sha256(await readFile(path.join(runRoot, relativePath)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function optionalJsonDigest(runRoot: string, relativePath: string): Promise<string | undefined> {
  try {
    return sha256(JSON.stringify(JSON.parse(await readFile(path.join(runRoot, relativePath), "utf8"))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function intentContractsDigest(runRoot: string, manifest: RunManifest): Promise<string | undefined> {
  try {
    const intents = await Promise.all(manifest.changes.map(async (change) =>
      JSON.parse(await readFile(path.join(runRoot, "intents", `${change.id}.json`), "utf8")),
    ));
    return sha256(JSON.stringify(intents));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function verifyExecutionFingerprint(fingerprint: ExecutionFingerprint): boolean {
  const { inputsDigest, ...unsigned } = fingerprint;
  return inputsDigest === sha256(JSON.stringify(unsigned));
}

export async function createExecutionFingerprint(
  runRoot: string,
  result: CommandResult,
  binding: ExecutionBinding,
): Promise<ExecutionFingerprint> {
  const workspaceTree = binding.workspaceTree ?? (
    binding.workspaceCommit
      ? await resolveTree(binding.manifest.repositoryRoot, binding.workspaceCommit)
      : undefined
  );
  const [testReportDigest, currentIntentContractsDigest, hypothesesDigest, requirementResolutionsDigest, repairCandidateDigest] = await Promise.all([
    optionalArtifactDigest(runRoot, result.testReportArtifact),
    intentContractsDigest(runRoot, binding.manifest),
    optionalJsonDigest(runRoot, "hypotheses.json"),
    optionalJsonDigest(runRoot, "requirement-resolutions.json"),
    optionalJsonDigest(runRoot, "repair-metadata.json"),
  ]);
  const currentWorkspaceStateDigest = binding.workspacePath
    ? await computeWorkspaceStateDigest(binding.workspacePath)
    : undefined;
  const unsigned = {
    schemaVersion: "1" as const,
    runId: binding.manifest.runId,
    baseCommit: binding.manifest.resolvedBaseCommit,
    ...(binding.manifest.resolvedBaseTree ? { baseTree: binding.manifest.resolvedBaseTree } : {}),
    changes: binding.manifest.changes.map((change) => ({
      id: change.id,
      commit: change.resolvedCommit,
      ...(change.resolvedTree ? { tree: change.resolvedTree } : {}),
      ...(change.promptDigest ? { promptDigest: change.promptDigest } : {}),
    })),
    ...(binding.manifest.configDigest ? { configDigest: binding.manifest.configDigest } : {}),
    workspace: result.workspace,
    ...(binding.workspaceCommit ? { workspaceCommit: binding.workspaceCommit } : {}),
    ...(workspaceTree ? { workspaceTree } : {}),
    ...(currentWorkspaceStateDigest ? { workspaceStateDigest: currentWorkspaceStateDigest } : {}),
    commandDigest: sha256(result.command),
    ...(result.environmentPolicy
      ? { environmentPolicyDigest: sha256(JSON.stringify(result.environmentPolicy)) }
      : {}),
    ...(binding.testSourceDigest ? { testSourceDigest: binding.testSourceDigest } : {}),
    ...(testReportDigest ? { testReportDigest } : {}),
    ...(currentIntentContractsDigest ? { intentContractsDigest: currentIntentContractsDigest } : {}),
    ...(hypothesesDigest ? { hypothesesDigest } : {}),
    ...(requirementResolutionsDigest ? { requirementResolutionsDigest } : {}),
    ...(repairCandidateDigest ? { repairCandidateDigest } : {}),
  };
  return { ...unsigned, inputsDigest: sha256(JSON.stringify(unsigned)) };
}

function persistedCommandResult(result: CommandResult): CommandResult {
  const { stdout: _stdout, stderr: _stderr, ...persisted } = result as CommandResult & {
    stdout?: string;
    stderr?: string;
  };
  return persisted;
}

async function readExistingSummary(runRoot: string): Promise<ExistingTestSummary> {
  try {
    return parseExistingTestSummaryArtifact(
      await readJson<unknown>(runRoot, "test-results/existing.json"),
    ).value as ExistingTestSummary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return {
    schemaVersion: "2",
    beforeRepair: {},
    afterRepair: {},
    fingerprints: { beforeRepair: {}, afterRepair: {} },
  };
}

export async function writeExecutionRecord(
  runRoot: string,
  stage: ExecutionRecord["stage"],
  result: CommandResult,
  binding: ExecutionBinding,
): Promise<string> {
  const executionId = `${result.workspace}-${result.commandId}`;
  const persisted = persistedCommandResult(result);
  const inputs = await createExecutionFingerprint(runRoot, persisted, binding);
  return writeJson(runRoot, `executions/${executionId}.json`, {
    schemaVersion: "2",
    executionId,
    stage,
    recordedAt: new Date().toISOString(),
    inputs,
    result: persisted,
  } satisfies ExecutionRecord);
}

export async function recordExistingTestResult(
  runRoot: string,
  workspace: ExistingWorkspace,
  result: CommandResult,
  label: ExistingTestEvidenceLabel = "before-repair",
  binding: ExecutionBinding,
): Promise<ExistingTestSummary> {
  await writeExecutionRecord(runRoot, "existing-test", result, binding);
  const persisted = persistedCommandResult(result);
  await writeJson(runRoot, `test-results/${workspace}/result.${label}.json`, persisted);
  const summary = await readExistingSummary(runRoot);
  const phase = label === "before-repair" ? "beforeRepair" : "afterRepair";
  summary[phase][workspace] = persisted;
  summary.fingerprints[phase][workspace] = await createExecutionFingerprint(runRoot, persisted, binding);
  await writeJson(runRoot, "test-results/existing.json", summary);
  return summary;
}
