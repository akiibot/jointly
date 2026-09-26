import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { resolveChanges } from "../src/changes.js";
import type { JointlyConfig } from "../src/types.js";

const exec = promisify(execFile);
async function git(cwd: string, ...args: string[]): Promise<string> {
  return (await exec("git", args, { cwd })).stdout.trim();
}

describe("resolveChanges", () => {
  it("rejects a change that does not descend from the configured base", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-changes-"));
    await git(root, "init", "-q");
    await git(root, "config", "user.email", "test@example.com");
    await git(root, "config", "user.name", "Test");
    await writeFile(path.join(root, "file.txt"), "base");
    await git(root, "add", "file.txt");
    await git(root, "commit", "-qm", "base");
    const base = await git(root, "rev-parse", "HEAD");
    await git(root, "checkout", "--orphan", "unrelated");
    await git(root, "rm", "-qf", "file.txt");
    await writeFile(path.join(root, "other.txt"), "other");
    await git(root, "add", "other.txt");
    await git(root, "commit", "-qm", "other");
    const unrelated = await git(root, "rev-parse", "HEAD");

    const config: JointlyConfig = {
      project: { name: "x", root: "." },
      base: { ref: base },
      changes: [
        { id: "a", ref: unrelated, promptFile: "a.md" },
        { id: "b", ref: unrelated, promptFile: "b.md" },
      ],
      commands: { test: "true" },
    };
    await expect(resolveChanges(root, config)).rejects.toThrow("does not originate");
  });
});
