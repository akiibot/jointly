import path from "node:path";
import { runCommand, writeJson } from "@jointly/core";
import type { WorkspaceName } from "@jointly/core";
import { bounded, loadRun, loadWorkspaces, readOptionalJson, type ToolContext } from "../context.js";

type ExistingWorkspace = Exclude<WorkspaceName, "repaired">;

export async function runExistingTests(context: ToolContext, runId: string, workspaceName: ExistingWorkspace) {
  const { runRoot, manifest, config } = await loadRun(context, runId);
  const prepared = await loadWorkspaces(runRoot);
  const workspace = prepared.workspaces.find((candidate) => candidate.name === workspaceName);
  if (!workspace) throw new Error(`workspace is not prepared: ${workspaceName}`);
  const result = await runCommand({
    cwd: path.join(workspace.path, config.project.root),
    command: manifest.commands.test,
    workspace: workspaceName,
    runRoot,
    commandId: `mcp-existing-${workspaceName}`,
  });
  await writeJson(runRoot, `test-results/${workspaceName}/result.json`, result);
  const currentSummary = await readOptionalJson<Record<string, unknown>>(runRoot, "test-results/existing.json");
  const summary = currentSummary && !Array.isArray(currentSummary) ? currentSummary : {};
  summary[workspaceName] = result;
  await writeJson(runRoot, "test-results/existing.json", summary);
  return {
    ...result,
    stdout: bounded(result.stdout, 16 * 1024),
    stderr: bounded(result.stderr, 16 * 1024),
  };
}
