import { prepareWorkspaces as prepareCoreWorkspaces } from "@jointly/core";
import path from "node:path";
import { fileExists, loadRun, loadWorkspaces, type ToolContext } from "../context.js";

export async function prepareWorkspaces(context: ToolContext, runId: string) {
  const { runRoot, manifest } = await loadRun(context, runId);
  if (await fileExists(path.join(runRoot, "workspaces.json"))) {
    return loadWorkspaces(runRoot);
  }
  return prepareCoreWorkspaces(context.repositoryRoot, runRoot, manifest);
}
