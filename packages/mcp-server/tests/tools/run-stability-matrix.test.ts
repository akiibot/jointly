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
    expect(result).toMatchObject({ iterations: 2, passed: 0, failed: 2, seed: 7 });
    const evidence = await collectEvidence(fixture.context, fixture.registration.runId, ["PAYMENT-3"]);
    expect(evidence.artifacts.find((artifact) => artifact.artifact === "stability.json")?.exists).toBe(true);
  });
});
