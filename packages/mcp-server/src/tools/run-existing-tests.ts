import path from "node:path";
import {
  enrichCommandWithVitestReport,
  prepareVitestReport,
  recordExistingTestResult,
  runCommand,
} from "@jointly/core";
import type { WorkspaceName } from "@jointly/core";
import { bounded, loadRun, loadWorkspaces, type ToolContext } from "../context.js";

type ExistingWorkspace = Exclude<WorkspaceName, "repaired">;

export async function runExistingTests(
  context: ToolContext,
  runId: string,
  workspaceName: ExistingWorkspace,
  evidenceLabel: "before-repair" | "after-repair" = "before-repair",
) {
  const { runRoot, manifest, config } = await loadRun(context, runId);
  const prepared = await loadWorkspaces(runRoot);
  const workspace = prepared.workspaces.find((candidate) => candidate.name === workspaceName);
  if (!workspace) throw new Error(`workspace is not prepared: ${workspaceName}`);
  const cwd = path.join(workspace.path, config.project.root);
  const reportPath = manifest.commands.testReport
    ? await prepareVitestReport(cwd, manifest.commands.testReport)
    : undefined;
  const executed = await runCommand({
    cwd,
    command: manifest.commands.test,
    workspace: workspaceName,
    runRoot,
    commandId: `mcp-existing-${workspaceName}-${evidenceLabel}`,
  });
  const result = reportPath
    ? await enrichCommandWithVitestReport(runRoot, reportPath, executed)
    : { ...executed, testReportError: "commands.testReport is not configured" };
  await recordExistingTestResult(runRoot, workspaceName, result, evidenceLabel, {
    manifest,
    workspaceCommit: workspace.commit,
    workspacePath: workspace.path,
  });
  return {
    ...result,
    stdout: bounded(result.stdout, 16 * 1024),
    stderr: bounded(result.stderr, 16 * 1024),
  };
}
