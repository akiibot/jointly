import { spawn } from "node:child_process";

export interface GitResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runGit(cwd: string, args: readonly string[]): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", [...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

export async function git(cwd: string, args: readonly string[]): Promise<string> {
  const result = await runGit(cwd, args);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args[0] ?? "command"} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

export function resolveRef(repositoryRoot: string, ref: string): Promise<string> {
  return git(repositoryRoot, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]);
}

export async function isAncestor(repositoryRoot: string, ancestor: string, descendant: string): Promise<boolean> {
  const result = await runGit(repositoryRoot, ["merge-base", "--is-ancestor", ancestor, descendant]);
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(`git merge-base failed: ${result.stderr.trim()}`);
  }
  return result.exitCode === 0;
}

export function commonBase(repositoryRoot: string, left: string, right: string): Promise<string> {
  return git(repositoryRoot, ["merge-base", left, right]);
}

export async function listChangedFiles(repositoryRoot: string, from: string, to: string): Promise<string[]> {
  const output = await git(repositoryRoot, ["diff", "--name-only", from, to, "--"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

export async function createDetachedWorktree(repositoryRoot: string, targetPath: string, commit: string): Promise<void> {
  await git(repositoryRoot, ["worktree", "add", "--detach", targetPath, commit]);
}

export async function removeWorktree(repositoryRoot: string, targetPath: string): Promise<void> {
  await git(repositoryRoot, ["worktree", "remove", "--force", targetPath]);
}
