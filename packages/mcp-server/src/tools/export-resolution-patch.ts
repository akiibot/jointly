import { runGit, writeLog } from "@jointly/core";
import { loadRun, loadWorkspaces, type ToolContext } from "../context.js";

export async function exportResolutionPatch(context: ToolContext, runId: string) {
  const { runRoot } = await loadRun(context, runId);
  const prepared = await loadWorkspaces(runRoot);
  const combined = prepared.workspaces.find((workspace) => workspace.name === "combined");
  if (!combined) throw new Error("combined workspace is not prepared");
  // Intent-to-add makes new files visible to `git diff` without staging their content.
  const intent = await runGit(combined.path, ["add", "-N", "--", "."]);
  if (intent.exitCode !== 0) throw new Error(intent.stderr || "unable to inspect new repair files");
  const [patch, names] = await Promise.all([
    runGit(combined.path, ["diff", "--binary", "HEAD", "--"]),
    runGit(combined.path, ["diff", "--name-only", "HEAD", "--"]),
  ]);
  if (patch.exitCode !== 0 || names.exitCode !== 0) {
    throw new Error(patch.stderr || names.stderr || "unable to export repair patch");
  }
  await writeLog(runRoot, "repair.patch", patch.stdout);
  return {
    artifact: "repair.patch",
    changedFiles: names.stdout.trim().split("\n").filter(Boolean),
    bytes: Buffer.byteLength(patch.stdout),
    sourceBranchesModified: false,
  };
}
