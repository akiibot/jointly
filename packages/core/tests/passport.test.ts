import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assemblePassport, assertVerdict } from "../src/passport.js";
import { writeJson } from "../src/evidence.js";
import type { RunManifest } from "../src/types.js";

const manifest: RunManifest = {
  runId: "run-1",
  createdAt: "2026-09-26T00:00:00.000Z",
  repositoryRoot: "/repo",
  baseRef: "base",
  resolvedBaseCommit: "abc",
  changes: [
    { id: "a", ref: "a", resolvedCommit: "def", promptPath: "a.md" },
    { id: "b", ref: "b", resolvedCommit: "ghi", promptPath: "b.md" },
  ],
  commands: { test: "npm test" },
};

describe("passport", () => {
  it("rejects unsupported verdict strings", () => {
    expect(() => assertVerdict("MAYBE")).toThrow("unsupported");
  });

  it("assembles supported non-safe verdicts from evidence", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-passport-"));
    await writeJson(root, "manifest.json", manifest);
    const passport = await assemblePassport(root, {
      verdict: "COLLISION_CONFIRMED",
      summary: "Replay rejected",
      collisionEvidence: { requirementIds: ["PAYMENT-3"] },
    });
    expect(passport.runId).toBe("run-1");
    expect(passport.verdict).toBe("COLLISION_CONFIRMED");
  });

  it("requires complete evidence for SAFE_TO_MERGE", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-passport-"));
    await writeJson(root, "manifest.json", manifest);
    await expect(
      assemblePassport(root, { verdict: "SAFE_TO_MERGE", summary: "unsafe claim" }),
    ).rejects.toThrow("requires complete intent");
    await writeFile(path.join(root, "repair.patch"), "patch");
  });

  it("allows SAFE_TO_MERGE only when every evidence gate passes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-passport-"));
    await writeJson(root, "manifest.json", manifest);
    await writeFile(path.join(root, "repair.patch"), "patch");
    const passingResult = { exitCode: 0, timedOut: false };
    const passport = await assemblePassport(root, {
      verdict: "SAFE_TO_MERGE",
      summary: "Verified repair",
      intents: [{ changeId: "a" }, { changeId: "b" }],
      requirements: [{ id: "A-1" }],
      testResults: {
        base: passingResult,
        "change-a": passingResult,
        "change-b": passingResult,
        combined: passingResult,
      },
      collisionEvidence: {
        beforeRepair: { classification: "confirmed-collision" },
        afterRepair: { classification: "hypothesis-rejected", commandResult: passingResult },
      },
      repair: "patch",
      repairSummary: "One-expression compatibility repair.",
      stability: { iterations: 50, passed: 50, failed: 0 },
    });
    expect(passport.verdict).toBe("SAFE_TO_MERGE");
  });
});
