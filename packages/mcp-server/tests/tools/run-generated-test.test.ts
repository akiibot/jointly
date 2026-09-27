import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { classifyGeneratedTest, runGeneratedTest } from "../../src/tools/run-generated-test.js";
import { createRegisteredFixture, interactionRunnerSource } from "../helpers.js";

describe("run_generated_test", () => {
  it("classifies an assertion failure as a confirmed-collision candidate", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const generated = path.join(fixture.registration.runRoot, "generated-tests");
    await mkdir(generated, { recursive: true });
    await writeFile(path.join(generated, "interaction.test.ts"), "// generated test\n");
    const result = await runGeneratedTest(fixture.context, {
      runId: fixture.registration.runId,
      testPath: "generated-tests/interaction.test.ts",
      hypothesisId: "HYP-1",
      requirementIds: ["PAYMENT-3"],
      expected: "same payment",
    });
    expect(result.classification).toBe("confirmed-collision");
  });

  it("does not misclassify compilation failures", () => {
    expect(
      classifyGeneratedTest({
        commandResult: { exitCode: 127, timedOut: false },
        generatedTestFilename: "interaction.test.ts",
        reportError: "ENOENT",
      }).classification,
    ).toBe("environment-failure");
    expect(
      classifyGeneratedTest({
        commandResult: { exitCode: 1, timedOut: false },
        generatedTestFilename: "interaction.test.ts",
        report: {
          success: false,
          numTotalTests: 0,
          numPassedTests: 0,
          numFailedTests: 0,
          numPendingTests: 0,
          numTodoTests: 0,
          testResults: [],
        },
      }).classification,
    ).toBe("insufficient-evidence");
  });

  it("preserves confirmed evidence when a repaired rerun passes", async () => {
    const fixture = await createRegisteredFixture();
    const prepared = await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const combined = prepared.workspaces.find((workspace) => workspace.name === "combined")!;
    const generated = path.join(fixture.registration.runRoot, "generated-tests");
    await mkdir(generated, { recursive: true });
    await writeFile(path.join(generated, "interaction.test.ts"), "// generated test\n");

    const input = {
      runId: fixture.registration.runId,
      testPath: "generated-tests/interaction.test.ts",
      hypothesisId: "HYP-1",
      requirementIds: ["PAYMENT-3"],
      expected: "same payment",
    } as const;
    const before = await runGeneratedTest(fixture.context, { ...input, evidenceLabel: "before-repair" });
    expect(before.classification).toBe("confirmed-collision");
    expect(before.executedTestDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(before.executedTestArtifact).toMatch(/^generated-tests\/executions\//);

    await writeFile(path.join(combined.path, "interaction-runner.mjs"), interactionRunnerSource(true));
    const after = await runGeneratedTest(fixture.context, { ...input, evidenceLabel: "after-repair" });
    expect(after.classification).toBe("hypothesis-rejected");

    const canonical = JSON.parse(
      await readFile(path.join(fixture.registration.runRoot, "collision-evidence.json"), "utf8"),
    ) as { classification: string };
    expect(canonical.classification).toBe("confirmed-collision");
    expect(
      JSON.parse(
        await readFile(
          path.join(fixture.registration.runRoot, "collision-evidence.after-repair.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({ classification: "hypothesis-rejected" });
  });

  it("rejects a changed generated test after collision confirmation", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const generated = path.join(fixture.registration.runRoot, "generated-tests");
    const testPath = path.join(generated, "interaction.test.ts");
    await mkdir(generated, { recursive: true });
    await writeFile(testPath, "// original generated test\n");
    const input = {
      runId: fixture.registration.runId,
      testPath: "generated-tests/interaction.test.ts",
      hypothesisId: "HYP-1",
      requirementIds: ["PAYMENT-3"],
      expected: "same payment",
    } as const;
    await runGeneratedTest(fixture.context, { ...input, evidenceLabel: "before-repair" });
    await writeFile(testPath, "// weakened generated test\n");
    await expect(
      runGeneratedTest(fixture.context, { ...input, evidenceLabel: "after-repair" }),
    ).rejects.toThrow("changed after collision confirmation");
  });
});
