import { describe, expect, it } from "vitest";
import {
  intentContractSchema,
  parseExecutionRecordArtifact,
  parseExistingTestSummaryArtifact,
  parseRunManifestArtifact,
  requirementResolutionSchema,
  runManifestV2Schema,
} from "../src/schemas.js";

const commands = { test: "npm test" };
const changes = [
  { id: "a", ref: "a", resolvedCommit: "aaa", promptPath: "a.md" },
  { id: "b", ref: "b", resolvedCommit: "bbb", promptPath: "b.md" },
];
const baseManifest = {
  runId: "run-1",
  createdAt: "2026-09-27T00:00:00.000Z",
  repositoryRoot: "/repo",
  baseRef: "main",
  resolvedBaseCommit: "ccc",
  changes,
  commands,
};

describe("artifact schemas", () => {
  it("accepts current manifests and identifies legacy imports explicitly", () => {
    expect(parseRunManifestArtifact({ schemaVersion: "2", ...baseManifest }).importStatus).toBe("current");
    expect(parseRunManifestArtifact(baseManifest).importStatus).toBe("legacy-read-only");
  });

  it("rejects unknown manifest fields and malformed timestamps", () => {
    expect(runManifestV2Schema.safeParse({ schemaVersion: "2", ...baseManifest, surprise: true }).success).toBe(false);
    expect(runManifestV2Schema.safeParse({ schemaVersion: "2", ...baseManifest, createdAt: "yesterday" }).success).toBe(false);
  });

  it("requires complete intent contracts", () => {
    expect(intentContractSchema.safeParse({ changeId: "a", requirements: [{ id: "A-1" }] }).success).toBe(false);
    expect(intentContractSchema.safeParse({
      changeId: "a",
      goal: "Add rule A",
      entities: ["payment"],
      sideEffects: ["capture"],
      ambiguities: [],
      requirements: [{
        id: "A-1",
        statement: "Capture once",
        type: "invariant",
        entities: ["payment"],
        sideEffects: ["capture"],
        observableOutcome: "one capture",
        source: { file: "a.md", excerpt: "Capture once" },
      }],
    }).success).toBe(true);
  });

  it("requires authority for resolved requirement decisions", () => {
    const resolution = {
      schemaVersion: "1",
      id: "R-1",
      conflictingRequirementIds: ["A-1", "B-1"],
      originalStatements: [
        { requirementId: "A-1", statement: "A" },
        { requirementId: "B-1", statement: "B" },
      ],
      decision: "preserve-both",
      rationale: "Both are independently observable.",
      affectedTests: ["tests/interaction.test.ts"],
      createdAt: "2026-09-27T00:00:00.000Z",
    };
    expect(requirementResolutionSchema.safeParse(resolution).success).toBe(false);
    expect(requirementResolutionSchema.safeParse({
      ...resolution,
      authority: { kind: "operator", source: "decision-1" },
    }).success).toBe(true);
  });

  it("adapts legacy evidence as explicitly unverified", () => {
    expect(parseExistingTestSummaryArtifact({
      schemaVersion: "1",
      beforeRepair: {},
      afterRepair: {},
    }).importStatus).toBe("legacy-unverified");
    expect(parseExecutionRecordArtifact({
      schemaVersion: "1",
      executionId: "combined-test",
      stage: "existing-test",
      recordedAt: "2026-09-27T00:00:00.000Z",
      result: {
        commandId: "test",
        workspace: "combined",
        command: "npm test",
        exitCode: 0,
        timedOut: false,
        durationMs: 1,
        stdoutArtifact: "out.log",
        stderrArtifact: "err.log",
      },
    }).importStatus).toBe("legacy-unverified");
  });
});
