import path from "node:path";
import { runCommand } from "./runner.js";
import { writeJson } from "./evidence.js";
import type { StabilityConfig, StabilityResult, WorkspaceName } from "./types.js";

export interface StabilityOptions extends StabilityConfig {
  command: string;
  cwd: string;
  runRoot: string;
  workspace?: WorkspaceName;
  timeoutMs?: number;
}

export async function runStability(options: StabilityOptions): Promise<StabilityResult> {
  const result: StabilityResult = {
    iterations: options.iterations,
    passed: 0,
    failed: 0,
    seed: options.seed,
    concurrency: options.concurrency,
    failedIterations: [],
  };
  let next = 0;
  const workers = Array.from({ length: Math.min(options.concurrency, options.iterations) }, async () => {
    while (true) {
      const iteration = next++;
      if (iteration >= options.iterations) return;
      const command = await runCommand({
        cwd: options.cwd,
        command: options.command,
        workspace: options.workspace ?? "repaired",
        runRoot: options.runRoot,
        timeoutMs: options.timeoutMs,
        commandId: `stability-${String(iteration + 1).padStart(3, "0")}`,
        env: { JOINTLY_SEED: String(options.seed), JOINTLY_ITERATION: String(iteration + 1) },
      });
      if (command.exitCode === 0 && !command.timedOut) {
        result.passed += 1;
      } else {
        result.failed += 1;
        result.failedIterations.push({
          iteration: iteration + 1,
          evidenceArtifact: path.posix.join("test-results", command.workspace, `${command.commandId}.stderr.log`),
        });
      }
    }
  });
  await Promise.all(workers);
  result.failedIterations.sort((a, b) => a.iteration - b.iteration);
  await writeJson(options.runRoot, "stability.json", result);
  return result;
}
