import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runStability } from "../src/stability.js";

describe("runStability", () => {
  it("runs the configured number of deterministic iterations", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-stability-"));
    const result = await runStability({
      command: "node -e 'process.exit(0)'",
      cwd: root,
      runRoot: root,
      iterations: 3,
      concurrency: 2,
      seed: 20260926,
    });
    expect(result).toMatchObject({ iterations: 3, passed: 3, failed: 0, seed: 20260926 });
  });
});
