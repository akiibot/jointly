import { lstat, mkdir, symlink } from "node:fs/promises";
import path from "node:path";
import { createDetachedWorktree, git, runGit } from "./git.js";
import { writeJson } from "./evidence.js";
import type { RunManifest, WorkspacePreparation, WorkspaceRecord } from "./types.js";

async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch {
    return false;
  }
}

async function linkDependencies(repositoryRoot: string, workspacePath: string): Promise<void> {
  const source = path.join(repositoryRoot, "node_modules");
  const destination = path.join(workspacePath, "node_modules");
  if ((await exists(source)) && !(await exists(destination))) {
    await symlink(source, destination, "dir");
  }
}

async function addWorkspace(
  repositoryRoot: string,
  workspacesRoot: string,
  name: WorkspaceRecord["name"],
  commit: string,
): Promise<WorkspaceRecord> {
  const workspacePath = path.join(workspacesRoot, name);
  await createDetachedWorktree(repositoryRoot, workspacePath, commit);
  await linkDependencies(repositoryRoot, workspacePath);
  return { name, path: workspacePath, commit };
}

async function mergeIntoCombined(combinedPath: string, changeId: string, commit: string) {
  const result = await runGit(combinedPath, [
    "-c",
    "user.name=Jointly",
    "-c",
    "user.email=jointly@local.invalid",
    "merge",
    "--no-ff",
    "--no-edit",
    commit,
  ]);
  if (result.exitCode === 0) return null;
  const filesOutput = await runGit(combinedPath, ["diff", "--name-only", "--diff-filter=U"]);
  return {
    changeId,
    message: result.stderr.trim() || result.stdout.trim(),
    files: filesOutput.stdout.trim().split("\n").filter(Boolean),
  };
}

export async function prepareWorkspaces(
  repositoryRoot: string,
  runRoot: string,
  manifest: RunManifest,
): Promise<WorkspacePreparation> {
  const workspacesRoot = path.join(runRoot, "workspaces");
  await mkdir(workspacesRoot, { recursive: true });
  await git(repositoryRoot, ["worktree", "prune"]);

  const records: WorkspaceRecord[] = [];
  records.push(await addWorkspace(repositoryRoot, workspacesRoot, "base", manifest.resolvedBaseCommit));
  records.push(await addWorkspace(repositoryRoot, workspacesRoot, "change-a", manifest.changes[0].resolvedCommit));
  records.push(await addWorkspace(repositoryRoot, workspacesRoot, "change-b", manifest.changes[1].resolvedCommit));
  const combined = await addWorkspace(repositoryRoot, workspacesRoot, "combined", manifest.resolvedBaseCommit);
  records.push(combined);

  let textualConflict = await mergeIntoCombined(combined.path, manifest.changes[0].id, manifest.changes[0].resolvedCommit);
  if (!textualConflict) {
    textualConflict = await mergeIntoCombined(combined.path, manifest.changes[1].id, manifest.changes[1].resolvedCommit);
  }
  combined.commit = await git(combined.path, ["rev-parse", "HEAD"]);

  const preparation: WorkspacePreparation = { workspaces: records, textualConflict };
  await writeJson(runRoot, "workspaces.json", preparation);
  return preparation;
}
