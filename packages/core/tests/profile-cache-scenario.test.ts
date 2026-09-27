import { execFile } from "node:child_process";
import { cp, copyFile, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const fixtureRoot = path.join(repositoryRoot, "scenarios/profile-cache-collision");

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

async function runVitest(cwd: string, targets: string[]) {
  return execute(process.execPath, [path.join(repositoryRoot, "node_modules/vitest/vitest.mjs"), "run", ...targets], {
    cwd,
    maxBuffer: 2 * 1024 * 1024,
  });
}

describe("profile cache hidden-collision scenario", () => {
  it("fails only at interaction, then passes unchanged coverage after repair", async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "jointly-profile-cache-"));
    try {
      await cp(path.join(fixtureRoot, "base"), temporaryRoot, { recursive: true });
      await symlink(
        path.join(repositoryRoot, "node_modules"),
        path.join(temporaryRoot, "node_modules"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await git(temporaryRoot, ["init", "--initial-branch=main"]);
      await git(temporaryRoot, ["add", "."]);
      await git(temporaryRoot, ["commit", "-m", "base profile store"]);
      const base = (await git(temporaryRoot, ["rev-parse", "HEAD"])).stdout.trim();

      await git(temporaryRoot, ["switch", "-c", "change/profile-update"]);
      await git(temporaryRoot, ["apply", path.join(fixtureRoot, "changes/profile-update.patch")]);
      await git(temporaryRoot, ["add", "."]);
      await git(temporaryRoot, ["commit", "-m", "add profile updates"]);
      const changeA = (await git(temporaryRoot, ["rev-parse", "HEAD"])).stdout.trim();
      expect(`${(await runVitest(temporaryRoot, ["tests"])).stdout}`).toContain("2 passed");

      await git(temporaryRoot, ["switch", "main"]);
      await git(temporaryRoot, ["switch", "-c", "change/profile-cache"]);
      await git(temporaryRoot, ["apply", path.join(fixtureRoot, "changes/profile-cache.patch")]);
      await git(temporaryRoot, ["add", "."]);
      await git(temporaryRoot, ["commit", "-m", "add cached profile reads"]);
      const changeB = (await git(temporaryRoot, ["rev-parse", "HEAD"])).stdout.trim();
      expect(`${(await runVitest(temporaryRoot, ["tests"])).stdout}`).toContain("2 passed");

      expect((await git(temporaryRoot, ["rev-parse", `${changeA}^`])).stdout.trim()).toBe(base);
      expect((await git(temporaryRoot, ["rev-parse", `${changeB}^`])).stdout.trim()).toBe(base);
      await git(temporaryRoot, ["switch", "-c", "combined", changeA]);
      await git(temporaryRoot, ["merge", "--no-edit", changeB]);
      expect(`${(await runVitest(temporaryRoot, ["tests"])).stdout}`).toContain("3 passed");

      const interactionPath = path.join(temporaryRoot, "tests/interaction.test.ts");
      await copyFile(path.join(fixtureRoot, "validation/interaction.test.ts"), interactionPath);
      const unchangedInteraction = await readFile(interactionPath);
      let failureOutput = "";
      try {
        await runVitest(temporaryRoot, ["tests/interaction.test.ts"]);
      } catch (error) {
        const failure = error as Error & { stdout?: string; stderr?: string; code?: number };
        failureOutput = `${failure.stdout ?? ""}\n${failure.stderr ?? ""}`;
        expect(failure.code).toBe(1);
      }
      expect(failureOutput).toContain("refreshes a cached profile after a display-name update");
      expect(failureOutput).toContain("AssertionError");
      expect(failureOutput).toContain("Ada");
      expect(failureOutput).toContain("Grace");

      await git(temporaryRoot, ["apply", path.join(fixtureRoot, "validation/cache-revalidation.patch")]);
      expect(await readFile(interactionPath)).toEqual(unchangedInteraction);
      expect(`${(await runVitest(temporaryRoot, ["tests"])).stdout}`).toContain("4 passed");
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
