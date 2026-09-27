import path from "node:path";
import { readJson, runStability, type CollisionEvidence } from "@jointly/core";
import { loadRun, loadWorkspaces, type ToolContext } from "../context.js";

export interface StabilityInput {
  runId: string;
  iterations?: number;
  concurrency?: number;
  seed?: number;
}

export async function runStabilityMatrix(context: ToolContext, input: StabilityInput) {
  const { runRoot, manifest, config } = await loadRun(context, input.runId);
  const prepared = await loadWorkspaces(runRoot);
  const combined = prepared.workspaces.find((workspace) => workspace.name === "combined");
  if (!combined) throw new Error("combined workspace is not prepared");
  const defaults = manifest.stability ?? { iterations: 10, concurrency: 2, seed: 20260926 };
  const iterations = input.iterations ?? defaults.iterations;
  const concurrency = input.concurrency ?? defaults.concurrency;
  const seed = input.seed ?? defaults.seed;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100) {
    throw new Error("iterations must be between 1 and 100");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("concurrency must be between 1 and 8");
  }
  let testSourceDigest: string | undefined;
  try {
    testSourceDigest = (await readJson<CollisionEvidence>(runRoot, "collision-evidence.before-repair.json")).executedTestDigest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return runStability({
    command: manifest.commands.interactionTest ?? manifest.commands.test,
    cwd: path.join(combined.path, config.project.root),
    runRoot,
    workspace: "combined",
    iterations,
    concurrency,
    seed,
    scenario: "configured-interaction-test",
    manifest,
    workspaceCommit: combined.commit,
    workspacePath: combined.path,
    testSourceDigest,
  });
}
