import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../src/workspace.js";
import type { RunManifest } from "../src/types.js";

const exec = promisify(execFile);
async function git(cwd: string, ...args: string[]): Promise<string> {
  return (await exec("git", args, { cwd })).stdout.trim();
}

describe("prepareWorkspaces", () => {
  it("creates isolated base, A, B, and combined worktrees", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-workspace-"));
    await git(root, "init", "-q");
    await git(root, "config", "user.email", "test@example.com");
    await git(root, "config", "user.name", "Test");
    await writeFile(path.join(root, ".gitignore"), "runs/\n");
    await writeFile(path.join(root, "base.txt"), "base");
    await git(root, "add", ".");
    await git(root, "commit", "-qm", "base");
    const base = await git(root, "rev-parse", "HEAD");
    const initialBranch = await git(root, "branch", "--show-current");

    await git(root, "checkout", "-qb", "change-a");
    await writeFile(path.join(root, "a.txt"), "a");
    await git(root, "add", "a.txt");
    await git(root, "commit", "-qm", "a");
    const a = await git(root, "rev-parse", "HEAD");
    await git(root, "checkout", "-q", initialBranch);
    await git(root, "checkout", "-qb", "change-b");
    await writeFile(path.join(root, "b.txt"), "b");
    await git(root, "add", "b.txt");
    await git(root, "commit", "-qm", "b");
    const b = await git(root, "rev-parse", "HEAD");

    await mkdir(path.join(root, "node_modules"));
    await writeFile(path.join(root, "node_modules", "dependency-marker.txt"), "shared");

    const manifest: RunManifest = {
      runId: "run",
      createdAt: new Date().toISOString(),
      repositoryRoot: root,
      baseRef: base,
      resolvedBaseCommit: base,
      changes: [
        { id: "a", ref: "change-a", resolvedCommit: a, promptPath: "a.md" },
        { id: "b", ref: "change-b", resolvedCommit: b, promptPath: "b.md" },
      ],
      commands: { test: "true" },
    };
    const result = await prepareWorkspaces(root, path.join(root, "runs", "run"), manifest);
    expect(result.textualConflict).toBeNull();
    expect(result.workspaces.map((workspace) => workspace.name)).toEqual([
      "base",
      "change-a",
      "change-b",
      "combined",
    ]);
    const combined = result.workspaces.find((workspace) => workspace.name === "combined")!;
    expect(await readFile(path.join(combined.path, "a.txt"), "utf8")).toBe("a");
    expect(await readFile(path.join(combined.path, "b.txt"), "utf8")).toBe("b");
    expect(await readFile(path.join(combined.path, "node_modules", "dependency-marker.txt"), "utf8")).toBe("shared");
  });
});
