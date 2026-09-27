import { execFile } from "node:child_process";
import { cp, copyFile, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const fixtureRoot = path.join(repositoryRoot, "scenarios/compatible-cart");

async function git(cwd: string, args: string[]) {
  return execute("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Jointly fixture",
      GIT_AUTHOR_EMAIL: "fixture@jointly.invalid",
      GIT_COMMITTER_NAME: "Jointly fixture",
      GIT_COMMITTER_EMAIL: "fixture@jointly.invalid",
    },
  });
}

describe("compatible two-change scenario", () => {
  it("merges two changes from one base and passes meaningful interaction coverage", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "jointly-compatible-cart-"));
    try {
      await cp(path.join(fixtureRoot, "base"), temporaryRoot, { recursive: true });
      await git(temporaryRoot, ["init", "--initial-branch=main"]);
      await git(temporaryRoot, ["add", "."]);
      await git(temporaryRoot, ["commit", "-m", "base cart"]);
      const base = (await git(temporaryRoot, ["rev-parse", "HEAD"])).stdout.trim();

      await git(temporaryRoot, ["switch", "-c", "change/discount"]);
      await git(temporaryRoot, ["apply", path.join(fixtureRoot, "changes/discount.patch")]);
      await git(temporaryRoot, ["add", "."]);
      await git(temporaryRoot, ["commit", "-m", "add cart discount"]);
      const changeA = (await git(temporaryRoot, ["rev-parse", "HEAD"])).stdout.trim();

      await git(temporaryRoot, ["switch", "main"]);
      await git(temporaryRoot, ["switch", "-c", "change/audit"]);
      await git(temporaryRoot, ["apply", path.join(fixtureRoot, "changes/audit.patch")]);
      await git(temporaryRoot, ["add", "."]);
      await git(temporaryRoot, ["commit", "-m", "add cart audit"]);
      const changeB = (await git(temporaryRoot, ["rev-parse", "HEAD"])).stdout.trim();

      expect((await git(temporaryRoot, ["rev-parse", `${changeA}^`])).stdout.trim()).toBe(base);
      expect((await git(temporaryRoot, ["rev-parse", `${changeB}^`])).stdout.trim()).toBe(base);

      await git(temporaryRoot, ["switch", "-c", "combined", changeA]);
      await git(temporaryRoot, ["merge", "--no-edit", changeB]);
      await mkdir(path.join(temporaryRoot, "tests"), { recursive: true });
      await copyFile(path.join(fixtureRoot, "validation/interaction.test.ts"), path.join(temporaryRoot, "tests/interaction.test.ts"));
      await symlink(
        path.join(repositoryRoot, "node_modules"),
        path.join(temporaryRoot, "node_modules"),
        process.platform === "win32" ? "junction" : "dir",
      );

      const { stdout, stderr } = await execute(process.execPath, [
        path.join(repositoryRoot, "node_modules/vitest/vitest.mjs"), "run", "tests",
      ], { cwd: temporaryRoot, maxBuffer: 2 * 1024 * 1024 });
      expect(`${stdout}\n${stderr}`).toContain("2 passed");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
