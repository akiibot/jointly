import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { assemblePassport, assertVerdict } from "../src/passport.js";
import { createManifest, sha256 } from "../src/manifest.js";
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

const exec = promisify(execFile);

function intent(changeId: string, requirementId: string) {
  return {
    changeId,
    goal: `Goal ${changeId}`,
    requirements: [
      {
        id: requirementId,
        statement: `Requirement ${requirementId}`,
        source: { file: `${changeId}.md`, excerpt: `Source ${requirementId}` },
      },
    ],
  };
}

const hypotheses = [
  {
    id: "H-1",
    changeIds: ["a", "b"],
    requirementIds: ["A-1", "B-1"],
    scenario: ["Exercise both changes"],
  },
];

const completeEvidenceSummary = { schemaVersion: "1", missingRequired: [] };
const currentWorkspaceStates = {
  base: sha256("base-state"),
  "change-a": sha256("change-a-state"),
  "change-b": sha256("change-b-state"),
  combined: sha256("combined-state"),
};
const generatedTestDigest = sha256("generated interaction test");
const runtimeDiagnosis = {
  schemaVersion: "1",
  hypothesisId: "H-1",
  requirementIds: ["A-1", "B-1"],
  interpretation: "The observed assertion failure occurs only when both requirements interact.",
  evidenceArtifact: "collision-evidence.before-repair.json",
  citations: [{ artifact: "collision-evidence.before-repair.json", digest: sha256("collision evidence") }],
};

async function safeRunFixture() {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "jointly-passport-repo-"));
  await exec("git", ["init", "-q", "-b", "main"], { cwd: repositoryRoot });
  await exec("git", ["config", "user.email", "test@example.com"], { cwd: repositoryRoot });
  await exec("git", ["config", "user.name", "Test"], { cwd: repositoryRoot });
  await mkdir(path.join(repositoryRoot, "scenarios"), { recursive: true });
  await writeFile(path.join(repositoryRoot, "scenarios", "a.md"), "A\n");
  await writeFile(path.join(repositoryRoot, "scenarios", "b.md"), "B\n");
  await writeFile(path.join(repositoryRoot, "base.txt"), "base\n");
  await exec("git", ["add", "."], { cwd: repositoryRoot });
  await exec("git", ["commit", "-qm", "base"], { cwd: repositoryRoot });
  await exec("git", ["tag", "base"], { cwd: repositoryRoot });
  await exec("git", ["checkout", "-qb", "a"], { cwd: repositoryRoot });
  await writeFile(path.join(repositoryRoot, "a.txt"), "a\n");
  await exec("git", ["add", "a.txt"], { cwd: repositoryRoot });
  await exec("git", ["commit", "-qm", "a"], { cwd: repositoryRoot });
  await exec("git", ["checkout", "-q", "main"], { cwd: repositoryRoot });
  await exec("git", ["checkout", "-qb", "b"], { cwd: repositoryRoot });
  await writeFile(path.join(repositoryRoot, "b.txt"), "b\n");
  await exec("git", ["add", "b.txt"], { cwd: repositoryRoot });
  await exec("git", ["commit", "-qm", "b"], { cwd: repositoryRoot });
  await exec("git", ["checkout", "-q", "main"], { cwd: repositoryRoot });
  return createManifest(repositoryRoot, {
    project: { name: "fixture", root: "." },
    base: { ref: "base" },
    changes: [
      { id: "a", ref: "a", promptFile: "scenarios/a.md" },
      { id: "b", ref: "b", promptFile: "scenarios/b.md" },
    ],
    commands: { test: "npm test" },
    stability: { iterations: 50, concurrency: 4, seed: 20260926 },
  });
}

function executionFingerprint(
  runManifest: RunManifest,
  workspace: keyof typeof currentWorkspaceStates,
  options: {
    requirementResolutions?: unknown;
    repairMetadata?: unknown;
    testSourceDigest?: string;
    intents?: unknown;
    hypotheses?: unknown;
  } = {},
) {
  const fingerprintIntents = options.intents ?? [intent("a", "A-1"), intent("b", "B-1")];
  const fingerprintHypotheses = options.hypotheses ?? hypotheses;
  const unsigned = {
    schemaVersion: "1" as const,
    runId: runManifest.runId,
    baseCommit: runManifest.resolvedBaseCommit,
    ...(runManifest.resolvedBaseTree ? { baseTree: runManifest.resolvedBaseTree } : {}),
    changes: runManifest.changes.map((change) => ({
      id: change.id,
      commit: change.resolvedCommit,
      ...(change.resolvedTree ? { tree: change.resolvedTree } : {}),
      ...(change.promptDigest ? { promptDigest: change.promptDigest } : {}),
    })),
    ...(runManifest.configDigest ? { configDigest: runManifest.configDigest } : {}),
    workspace,
    workspaceStateDigest: currentWorkspaceStates[workspace],
    commandDigest: sha256("npm test"),
    intentContractsDigest: sha256(JSON.stringify(fingerprintIntents)),
    hypothesesDigest: sha256(JSON.stringify(fingerprintHypotheses)),
    ...(options.testSourceDigest ? { testSourceDigest: options.testSourceDigest } : {}),
    ...(options.requirementResolutions
      ? { requirementResolutionsDigest: sha256(JSON.stringify(options.requirementResolutions)) }
      : {}),
    ...(options.repairMetadata
      ? { repairCandidateDigest: sha256(JSON.stringify(options.repairMetadata)) }
      : {}),
  };
  return { ...unsigned, inputsDigest: sha256(JSON.stringify(unsigned)) };
}

function existingEvidence(
  runManifest: RunManifest,
  basis: "repaired-collision" | "compatible-pair",
  options: { requirementResolutions?: unknown; repairMetadata?: unknown; intents?: unknown; hypotheses?: unknown } = {},
) {
  const passingResult = {
    exitCode: 0,
    timedOut: false,
    testCounts: { total: 1, passed: 1, failed: 0 },
  };
  const phase = basis === "repaired-collision" ? "afterRepair" : "beforeRepair";
  const results = Object.fromEntries(["base", "change-a", "change-b", "combined"].map((workspace) => [workspace, passingResult]));
  const fingerprints = Object.fromEntries(
    (["base", "change-a", "change-b", "combined"] as const).map((workspace) => [
      workspace,
      executionFingerprint(runManifest, workspace, options),
    ]),
  );
  return {
    schemaVersion: "2",
    beforeRepair: phase === "beforeRepair" ? results : {},
    afterRepair: phase === "afterRepair" ? results : {},
    fingerprints: {
      beforeRepair: phase === "beforeRepair" ? fingerprints : {},
      afterRepair: phase === "afterRepair" ? fingerprints : {},
    },
  };
}

function stabilityEvidence(
  runManifest: RunManifest,
  options: { requirementResolutions?: unknown; repairMetadata?: unknown; intents?: unknown; hypotheses?: unknown } = {},
) {
  return {
    iterations: 50,
    passed: 50,
    failed: 0,
    concurrency: 4,
    seed: 20260926,
    failedIterations: [],
    executions: Array.from({ length: 50 }, (_, index) => ({
      iteration: index + 1,
      executionArtifact: `executions/stability-${index + 1}.json`,
      inputs: executionFingerprint(runManifest, "combined", {
        ...options,
        testSourceDigest: generatedTestDigest,
      }),
    })),
  };
}

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
    const { runRoot: root, manifest: runManifest } = await safeRunFixture();
    await writeFile(path.join(root, "repair.patch"), "patch");
    const passingResult = {
      exitCode: 0,
      timedOut: false,
      testCounts: { total: 1, passed: 1, failed: 0 },
    };
    const repairMetadata = {
      schemaVersion: "1",
      patchDigest: sha256("patch"),
      productionFiles: ["src/fix.ts"],
      regressionTestFiles: ["tests/interaction/interaction.test.ts"],
      sourceInputIntegrity: { valid: true },
    };
    const testResults = existingEvidence(runManifest, "repaired-collision", { repairMetadata });
    const collisionEvidence = {
      beforeRepair: {
        classification: "confirmed-collision",
        hypothesisId: "H-1",
        requirementIds: ["A-1", "B-1"],
        executedTestDigest: generatedTestDigest,
        testCounts: { total: 1, passed: 0, failed: 1 },
      },
      afterRepair: { classification: "hypothesis-rejected", commandResult: passingResult },
    };
    const stability = stabilityEvidence(runManifest, { repairMetadata });
    const repairReview = {
      schemaVersion: "1",
      recommendation: "approve",
      repairDigest: sha256("patch"),
      generatedTestDigest,
      verificationContextDigest: sha256(JSON.stringify({
        collisionEvidence, testResults, stability, requirementResolutions: undefined, repairMetadata,
      })),
      reviewedFiles: ["src/fix.ts", "tests/interaction/interaction.test.ts"],
      testPreservationConcerns: [],
      summary: "Fresh review found the repair scoped and the generated test preserved.",
    };
    const passport = await assemblePassport(root, {
      verdict: "SAFE_TO_MERGE",
      summary: "Verified repair",
      verificationBasis: "repaired-collision",
      workspaceStateDigests: currentWorkspaceStates,
      intents: [intent("a", "A-1"), intent("b", "B-1")],
      requirements: [{ id: "A-1" }, { id: "B-1" }],
      hypotheses,
      testResults,
      collisionEvidence,
      runtimeDiagnosis,
      repair: "patch",
      repairMetadata,
      repairSummary: "One-expression compatibility repair.",
      stability,
      repairReview,
      evidenceSummary: completeEvidenceSummary,
    });
    expect(passport.verdict).toBe("SAFE_TO_MERGE");
  });

  it("does not let execution classification alone satisfy the semantic collision gate", async () => {
    const { runRoot: root, manifest: runManifest } = await safeRunFixture();
    await writeFile(path.join(root, "repair.patch"), "patch");
    const repairMetadata = {
      schemaVersion: "1", patchDigest: sha256("patch"), productionFiles: ["src/fix.ts"],
      regressionTestFiles: ["tests/interaction/interaction.test.ts"], sourceInputIntegrity: { valid: true },
    };
    await expect(assemblePassport(root, {
      verdict: "SAFE_TO_MERGE", summary: "Missing diagnosis", verificationBasis: "repaired-collision",
      workspaceStateDigests: currentWorkspaceStates,
      intents: [intent("a", "A-1"), intent("b", "B-1")], hypotheses,
      testResults: existingEvidence(runManifest, "repaired-collision", { repairMetadata }),
      collisionEvidence: {
        beforeRepair: { classification: "confirmed-collision", hypothesisId: "H-1", requirementIds: ["A-1", "B-1"], executedTestDigest: generatedTestDigest, testCounts: { total: 1, passed: 0, failed: 1 } },
        afterRepair: { classification: "hypothesis-rejected", commandResult: { exitCode: 0, timedOut: false, testCounts: { total: 1, passed: 1, failed: 0 } } },
      },
      repair: "patch", repairMetadata, repairSummary: "Repair", stability: stabilityEvidence(runManifest, { repairMetadata }),
      evidenceSummary: completeEvidenceSummary,
    })).rejects.toThrow("runtime diagnosis");
  });

  it("rejects a safe verdict when either complete intent contract is missing", async () => {
    const { runRoot, manifest: runManifest } = await safeRunFixture();
    const passingResult = {
      exitCode: 0,
      timedOut: false,
      testCounts: { total: 1, passed: 1, failed: 0 },
    };
    await expect(
      assemblePassport(runRoot, {
        verdict: "SAFE_TO_MERGE",
        summary: "Incomplete intent",
        verificationBasis: "compatible-pair",
        workspaceStateDigests: currentWorkspaceStates,
        intents: [intent("a", "A-1")],
        hypotheses,
        testResults: existingEvidence(runManifest, "compatible-pair"),
        collisionEvidence: {
          beforeRepair: {
            classification: "hypothesis-rejected",
            hypothesisId: "H-1",
            requirementIds: ["A-1"],
            executedTestDigest: generatedTestDigest,
            testCounts: { total: 1, passed: 1, failed: 0 },
          },
        },
        stability: stabilityEvidence(runManifest),
        evidenceSummary: completeEvidenceSummary,
      }),
    ).rejects.toThrow("requires complete intent");
  });

  it("supports a complete compatible pair without a fake repair", async () => {
    const { runRoot, manifest: runManifest } = await safeRunFixture();
    const passingResult = {
      exitCode: 0,
      timedOut: false,
      testCounts: { total: 1, passed: 1, failed: 0 },
    };
    const passport = await assemblePassport(runRoot, {
      verdict: "SAFE_TO_MERGE",
      summary: "Compatible within tested scope",
      verificationBasis: "compatible-pair",
      workspaceStateDigests: currentWorkspaceStates,
      intents: [intent("a", "A-1"), intent("b", "B-1")],
      hypotheses,
      testResults: existingEvidence(runManifest, "compatible-pair"),
      collisionEvidence: {
        beforeRepair: {
          classification: "hypothesis-rejected",
          hypothesisId: "H-1",
          requirementIds: ["A-1", "B-1"],
          executedTestDigest: generatedTestDigest,
          testFile: "tests/interaction/interaction.test.ts",
          testCounts: { total: 1, passed: 1, failed: 0 },
        },
      },
      stability: stabilityEvidence(runManifest),
      evidenceSummary: completeEvidenceSummary,
    });
    expect(passport.verificationBasis).toBe("compatible-pair");
    expect(passport.repair).toBeUndefined();
  });

  it("blocks unresolved intent conflicts and accepts an authorized traceable resolution", async () => {
    const { runRoot, manifest: runManifest } = await safeRunFixture();
    const passingResult = {
      exitCode: 0,
      timedOut: false,
      testCounts: { total: 1, passed: 1, failed: 0 },
    };
    const conflictingHypotheses = [
      {
        ...hypotheses[0],
        conflictingRequirementIds: ["A-1", "B-1"],
      },
    ];
    const input = {
      verdict: "SAFE_TO_MERGE" as const,
      summary: "Resolved compatible pair",
      verificationBasis: "compatible-pair" as const,
      workspaceStateDigests: currentWorkspaceStates,
      intents: [intent("a", "A-1"), intent("b", "B-1")],
      hypotheses: conflictingHypotheses,
      testResults: existingEvidence(runManifest, "compatible-pair", { hypotheses: conflictingHypotheses }),
      collisionEvidence: {
        beforeRepair: {
          classification: "hypothesis-rejected",
          hypothesisId: "H-1",
          requirementIds: ["A-1", "B-1"],
          executedTestDigest: generatedTestDigest,
          testCounts: { total: 1, passed: 1, failed: 0 },
        },
      },
      stability: stabilityEvidence(runManifest, { hypotheses: conflictingHypotheses }),
      evidenceSummary: completeEvidenceSummary,
    };
    await expect(assemblePassport(runRoot, input)).rejects.toThrow("requires complete intent");

    const resolutions = [
      {
        schemaVersion: "1",
        id: "R-1",
        conflictingRequirementIds: ["A-1", "B-1"],
        originalStatements: [
          { requirementId: "A-1", statement: "Requirement A-1" },
          { requirementId: "B-1", statement: "Requirement B-1" },
        ],
        decision: "accepted-replacement",
        proposedReplacement: "Combined rule",
        rationale: "Operator accepted the combined behavior.",
        authority: { kind: "operator", source: "review form decision 1" },
        affectedTests: ["tests/interaction/interaction.test.ts"],
        createdAt: "2026-09-27T00:00:00.000Z",
      },
    ];
    const passport = await assemblePassport(runRoot, {
      ...input,
      testResults: existingEvidence(runManifest, "compatible-pair", { requirementResolutions: resolutions, hypotheses: conflictingHypotheses }),
      stability: stabilityEvidence(runManifest, { requirementResolutions: resolutions, hypotheses: conflictingHypotheses }),
      requirementResolutions: resolutions,
    });
    expect(passport.verdict).toBe("SAFE_TO_MERGE");
    await expect(assemblePassport(runRoot, {
      ...input,
      testResults: existingEvidence(runManifest, "compatible-pair", { requirementResolutions: resolutions, hypotheses: conflictingHypotheses }),
      stability: stabilityEvidence(runManifest, { requirementResolutions: resolutions, hypotheses: conflictingHypotheses }),
      requirementResolutions: [{ ...resolutions[0], rationale: "A later, different decision." }],
    })).rejects.toThrow("stale input fingerprints");
  });
});
