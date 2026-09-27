import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  runCommand,
  classifyGeneratedVitestRun,
  parseVitestReport,
  readJson,
  sha256,
  writeExecutionRecord,
  writeJson,
  writeLog,
  type CollisionEvidence,
} from "@jointly/core";
import {
  assertSafeRelativePath,
  bounded,
  loadRun,
  loadWorkspaces,
  type ToolContext,
} from "../context.js";

export interface RunGeneratedTestInput {
  runId: string;
  testPath: string;
  hypothesisId: string;
  requirementIds: string[];
  expected: string;
  evidenceLabel?: "before-repair" | "after-repair";
}

export const classifyGeneratedTest = classifyGeneratedVitestRun;

export async function runGeneratedTest(context: ToolContext, input: RunGeneratedTestInput) {
  assertSafeRelativePath(input.testPath, "testPath");
  if (!input.testPath.startsWith("generated-tests/")) {
    throw new Error("testPath must be under generated-tests/");
  }
  const { runRoot, manifest, config } = await loadRun(context, input.runId);
  const prepared = await loadWorkspaces(runRoot);
  const combined = prepared.workspaces.find((workspace) => workspace.name === "combined");
  if (!combined) throw new Error("combined workspace is not prepared");
  if (!manifest.commands.interactionTest) throw new Error("commands.interactionTest is not configured");
  if (!manifest.commands.interactionTestReport) {
    throw new Error("commands.interactionTestReport is not configured");
  }

  const filename = path.basename(input.testPath);
  if (!filename.endsWith(".test.ts")) throw new Error("generated test must end in .test.ts");
  const destinationDirectory = path.join(combined.path, config.project.root, "tests", "interaction");
  await mkdir(destinationDirectory, { recursive: true });
  const generatedSource = await readFile(path.join(runRoot, input.testPath));
  const executedTestDigest = sha256(generatedSource);
  if (input.evidenceLabel === "after-repair") {
    const before = await readJson<CollisionEvidence>(runRoot, "collision-evidence.before-repair.json");
    if (!before.executedTestDigest || before.executedTestDigest !== executedTestDigest) {
      throw new Error("generated interaction test changed after collision confirmation; reproduce before repair again");
    }
  }
  await copyFile(path.join(runRoot, input.testPath), path.join(destinationDirectory, filename));
  const reportPath = path.join(
    combined.path,
    config.project.root,
    manifest.commands.interactionTestReport,
  );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await rm(reportPath, { force: true });

  const commandResult = await runCommand({
    cwd: path.join(combined.path, config.project.root),
    command: manifest.commands.interactionTest,
    workspace: "combined",
    runRoot,
  });
  await writeExecutionRecord(runRoot, "generated-test", commandResult, {
    manifest,
    workspaceCommit: combined.commit,
    workspacePath: combined.path,
    testSourceDigest: executedTestDigest,
  });
  const executedTestArtifact = await writeLog(
    runRoot,
    path.posix.join("generated-tests", "executions", `${commandResult.commandId}.test.ts`),
    generatedSource.toString("utf8"),
  );
  const observed = bounded(`${commandResult.stdout}\n${commandResult.stderr}`, 16 * 1024);
  let report;
  let reportError: string | undefined;
  try {
    report = parseVitestReport(JSON.parse(await readFile(reportPath, "utf8")));
    await writeJson(
      runRoot,
      path.posix.join("test-results", "combined", `${commandResult.commandId}.vitest.json`),
      report,
    );
  } catch (error) {
    reportError = error instanceof Error ? error.message : String(error);
  }
  const classified = classifyGeneratedVitestRun({
    commandResult,
    report,
    reportError,
    generatedTestFilename: filename,
  });
  const evidence: CollisionEvidence = {
    hypothesisId: input.hypothesisId,
    classification: classified.classification,
    requirementIds: input.requirementIds,
    testFile: input.testPath,
    executedTestArtifact,
    executedTestDigest,
    commandResult,
    expected: input.expected,
    observed,
    classificationReason: classified.reason,
    testCounts: classified.counts,
  };
  const evidenceArtifact = input.evidenceLabel
    ? `collision-evidence.${input.evidenceLabel}.json`
    : "collision-evidence.json";
  await writeJson(runRoot, evidenceArtifact, evidence);

  // Preserve the original confirmed collision as the canonical evidence.
  // A successful post-repair rerun belongs in its labelled artifact and must
  // not erase the proof that motivated the repair.
  if (input.evidenceLabel !== "after-repair") {
    await writeJson(runRoot, "collision-evidence.json", evidence);
  }
  return { ...evidence, evidenceArtifact };
}
