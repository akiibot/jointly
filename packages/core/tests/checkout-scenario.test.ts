import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const combinedRef = "origin/demo/combined-broken";
const protectedRefs = ["jointly-demo-base", "origin/agent/coupon", "origin/agent/payment-retry", combinedRef] as const;

async function refCommits(cwd: string) {
  return Object.fromEntries(await Promise.all(protectedRefs.map(async (ref) => {
    const { stdout } = await execute("git", ["rev-parse", ref], { cwd });
    return [ref, stdout.trim()];
  })));
}

describe("checkout validation oracle", () => {
  it("verifies the repaired interaction matrix without modifying frozen refs", async () => {
    const before = await refCommits(repositoryRoot);
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "jointly-checkout-matrix-"));
    const cloneRoot = path.join(temporaryRoot, "repository");
    try {
      await execute("git", ["clone", "--shared", "--no-checkout", repositoryRoot, cloneRoot]);
      await execute("git", ["-c", "advice.detachedHead=false", "checkout", before[combinedRef]!], { cwd: cloneRoot });
      await execute("git", ["apply", path.join(repositoryRoot, "scenarios/checkout/validation/coupon-aware-replay.patch")], { cwd: cloneRoot });
      const interactionDirectory = path.join(cloneRoot, "examples/checkout/tests/interaction");
      await mkdir(interactionDirectory, { recursive: true });
      await copyFile(
        path.join(repositoryRoot, "scenarios/checkout/validation/checkout-interaction-matrix.test.ts"),
        path.join(interactionDirectory, "checkout-interaction-matrix.test.ts"),
      );
      await copyFile(
        path.join(repositoryRoot, "scenarios/checkout/validation/deterministic-schedule.ts"),
        path.join(interactionDirectory, "deterministic-schedule.ts"),
      );
      await symlink(
        path.join(repositoryRoot, "node_modules"),
        path.join(cloneRoot, "node_modules"),
        process.platform === "win32" ? "junction" : "dir",
      );
      const { stdout, stderr } = await execute(process.execPath, [
        path.join(repositoryRoot, "node_modules/vitest/vitest.mjs"),
        "run",
        "tests/interaction/checkout-interaction-matrix.test.ts",
      ], {
        cwd: path.join(cloneRoot, "examples/checkout"),
        maxBuffer: 2 * 1024 * 1024,
      });
      expect(`${stdout}\n${stderr}`).toContain("17 passed");
      expect(await refCommits(repositoryRoot)).toEqual(before);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
