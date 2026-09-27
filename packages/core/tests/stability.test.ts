import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runStability } from "../src/stability.js";
import { stabilityResultSchema } from "../src/schemas.js";

describe("runStability", () => {
  it("runs the configured number of deterministic iterations", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-stability-"));
    const result = await runStability({
      command: "node -e \"process.stdout.write(process.env.JOINTLY_ITERATION + ':' + process.env.JOINTLY_SEED)\"",
      cwd: root,
      runRoot: root,
      iterations: 3,
      concurrency: 2,
      requestConcurrency: 3,
      seed: 20260926,
    });
    expect(result).toMatchObject({
      schemaVersion: "2",
      scenario: "configured-interaction-test",
      processIterations: 3,
      workerConcurrency: 2,
      requestConcurrency: 3,
      iterations: 3,
      passed: 3,
      failed: 0,
      baseSeed: 20260926,
      seed: 20260926,
      seedStrategy: "base-plus-iteration-minus-one",
    });
    expect(result.iterationResults.map(({ iteration, seed, outcome }) => ({ iteration, seed, outcome }))).toEqual([
      { iteration: 1, seed: 20260926, outcome: "passed" },
      { iteration: 2, seed: 20260927, outcome: "passed" },
      { iteration: 3, seed: 20260928, outcome: "passed" },
    ]);
    const outputs = await Promise.all(result.iterationResults.map((iteration) => readFile(path.join(root, iteration.stdoutArtifact), "utf8")));
    expect(outputs).toEqual(["1:20260926", "2:20260927", "3:20260928"]);
    expect(stabilityResultSchema.parse(result)).toEqual(result);
  });
});
