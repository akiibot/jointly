import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { runStabilityMatrix } from "../../src/tools/run-stability-matrix.js";
import { collectEvidence } from "../../src/tools/collect-evidence.js";
import { createRegisteredFixture } from "../helpers.js";

describe("run_stability_matrix", () => {
  it("uses bounded configured commands and records every iteration", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const result = await runStabilityMatrix(fixture.context, {
      runId: fixture.registration.runId,
      iterations: 2,
      concurrency: 1,
      seed: 7,
    });
    expect(result).toMatchObject({
      schemaVersion: "2",
      scenario: "configured-interaction-test",
      processIterations: 2,
      workerConcurrency: 1,
      requestConcurrency: null,
      iterations: 2,
      passed: 0,
      failed: 2,
      seed: 7,
    });
    expect(result.iterationResults.map(({ iteration, seed, outcome }) => ({ iteration, seed, outcome }))).toEqual([
      { iteration: 1, seed: 7, outcome: "failed" },
      { iteration: 2, seed: 8, outcome: "failed" },
    ]);
    const evidence = await collectEvidence(fixture.context, fixture.registration.runId, ["PAYMENT-3"]);
    expect(evidence.artifacts.find((artifact) => artifact.artifact === "stability.json")?.exists).toBe(true);
    const executions = (await readdir(path.join(fixture.registration.runRoot, "executions")))
      .filter((name) => name.includes("stability"));
    expect(executions).toHaveLength(2);
    const record = JSON.parse(
      await readFile(path.join(fixture.registration.runRoot, "executions", executions[0]!), "utf8"),
    );
    expect(record).toMatchObject({ schemaVersion: "2", stage: "stability", inputs: { runId: fixture.registration.runId } });
  });
});
