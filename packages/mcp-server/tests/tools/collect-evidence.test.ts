import { describe, expect, it } from "vitest";
import { writeJson } from "@jointly/core";
import { collectEvidence } from "../../src/tools/collect-evidence.js";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { createRegisteredFixture } from "../helpers.js";

describe("collect_evidence", () => {
  it("uses phase-specific completeness and derives requirement links from artifacts", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const root = fixture.registration.runRoot;
    await writeJson(root, "test-results/existing.json", {
      schemaVersion: "2",
      beforeRepair: {},
      afterRepair: {},
      fingerprints: { beforeRepair: {}, afterRepair: {} },
    });
    await writeJson(root, "intents/a.json", {
      changeId: "a",
      goal: "A",
      entities: ["payment"],
      sideEffects: ["capture"],
      ambiguities: [],
      requirements: [{ id: "A-1", statement: "A", type: "invariant", entities: ["payment"], sideEffects: ["capture"], observableOutcome: "A", source: { file: "a.md", excerpt: "A" } }],
    });
    await writeJson(root, "intents/b.json", {
      changeId: "b",
      goal: "B",
      entities: ["payment"],
      sideEffects: ["refund"],
      ambiguities: [],
      requirements: [{ id: "B-1", statement: "B", type: "invariant", entities: ["payment"], sideEffects: ["refund"], observableOutcome: "B", source: { file: "b.md", excerpt: "B" } }],
    });
    await writeJson(root, "hypotheses.json", [
      { id: "H-1", changeIds: ["a", "b"], requirementIds: ["A-1", "B-1"], sharedSurface: ["payment"], explanation: "A and B overlap", risk: "high", scenario: ["exercise A and B"] },
    ]);
    await writeJson(root, "collision-evidence.before-repair.json", {
      hypothesisId: "H-1",
      classification: "confirmed-collision",
      requirementIds: ["A-1", "B-1"],
      testFile: "generated-tests/interaction.test.ts",
      commandResult: {
        commandId: "interaction",
        workspace: "combined",
        command: "npm test",
        exitCode: 1,
        timedOut: false,
        durationMs: 10,
        stdoutArtifact: "test-results/combined/interaction.stdout.log",
        stderrArtifact: "test-results/combined/interaction.stderr.log",
      },
      expected: "A and B",
      observed: "B failed",
    });
    await writeJson(root, "runtime-diagnosis.json", {
      schemaVersion: "1",
      hypothesisId: "H-1",
      requirementIds: ["A-1", "B-1"],
      interpretation: "The assertion failure is caused by the interaction between A and B.",
      evidenceArtifact: "collision-evidence.before-repair.json",
      citations: [{ artifact: "collision-evidence.before-repair.json", digest: "a".repeat(64) }],
    });

    const investigation = await collectEvidence(fixture.context, fixture.registration.runId, {
      phase: "investigation",
    });
    expect(investigation.missingRequired).toEqual([]);
    expect(investigation.invalidRequired).toEqual([]);
    expect(investigation.requirementLinks).toContainEqual({
      requirementId: "A-1",
      artifact: "intents/a.json",
    });
    expect(investigation.requirementLinks.some((link) => link.requirementId === "FAKE")).toBe(false);

    const verification = await collectEvidence(fixture.context, fixture.registration.runId, {
      phase: "verification",
      verificationBasis: "repaired-collision",
    });
    expect(verification.missingRequired).toEqual(
      expect.arrayContaining([
        "collision-evidence.after-repair.json",
        "repair.patch",
        "repair-metadata.json",
        "repair-summary.md",
        "stability.json",
      ]),
    );
  });

  it("reports malformed required artifacts separately from missing artifacts", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    await writeJson(fixture.registration.runRoot, "intents/a.json", { changeId: "a", requirements: [] });
    const summary = await collectEvidence(fixture.context, fixture.registration.runId, { phase: "investigation" });
    expect(summary.invalidRequired).toContain("intents/a.json");
    expect(summary.missingRequired).not.toContain("intents/a.json");
  });
});
