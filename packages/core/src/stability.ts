import path from "node:path";
import { runCommand } from "./runner.js";
import { writeJson } from "./evidence.js";
import { createExecutionFingerprint, writeExecutionRecord } from "./execution-records.js";
import type { RunManifest, StabilityConfig, StabilityResult, WorkspaceName } from "./types.js";

export interface StabilityOptions extends StabilityConfig {
  command: string;
  cwd: string;
  runRoot: string;
  workspace?: WorkspaceName;
  timeoutMs?: number;
  manifest?: RunManifest;
  workspaceCommit?: string;
  workspacePath?: string;
  testSourceDigest?: string;
  scenario?: string;
  requestConcurrency?: number;
}

export async function runStability(options: StabilityOptions): Promise<StabilityResult> {
  const result: StabilityResult = {
    schemaVersion: "2",
    scenario: options.scenario ?? "configured-interaction-test",
    processIterations: options.iterations,
    workerConcurrency: options.concurrency,
    requestConcurrency: options.requestConcurrency ?? null,
    baseSeed: options.seed,
    seedStrategy: "base-plus-iteration-minus-one",
    iterations: options.iterations,
    passed: 0,
    failed: 0,
    seed: options.seed,
    concurrency: options.concurrency,
    failedIterations: [],
    executions: [],
    iterationResults: [],
  };
  let next = 0;
  const workers = Array.from({ length: Math.min(options.concurrency, options.iterations) }, async () => {
    while (true) {
      const iteration = next++;
      if (iteration >= options.iterations) return;
      const iterationSeed = options.seed + iteration;
      const command = await runCommand({
        cwd: options.cwd,
        command: options.command,
        workspace: options.workspace ?? "repaired",
        runRoot: options.runRoot,
        timeoutMs: options.timeoutMs,
        commandId: `stability-${String(iteration + 1).padStart(3, "0")}`,
        env: { JOINTLY_SEED: String(iterationSeed), JOINTLY_ITERATION: String(iteration + 1) },
      });
      let executionArtifact: string | undefined;
      let inputs: Awaited<ReturnType<typeof createExecutionFingerprint>> | undefined;
      if (options.manifest) {
        const binding = {
          manifest: options.manifest,
          workspaceCommit: options.workspaceCommit,
          workspacePath: options.workspacePath,
          testSourceDigest: options.testSourceDigest,
        };
        executionArtifact = await writeExecutionRecord(options.runRoot, "stability", command, binding);
        inputs = await createExecutionFingerprint(options.runRoot, command, binding);
        result.executions.push({
          iteration: iteration + 1,
          executionArtifact,
          inputs,
        });
      }
      if (command.exitCode === 0 && !command.timedOut) {
        result.passed += 1;
      } else {
        result.failed += 1;
        result.failedIterations.push({
          iteration: iteration + 1,
          evidenceArtifact: path.posix.join("test-results", command.workspace, `${command.commandId}.stderr.log`),
        });
      }
      result.iterationResults.push({
        iteration: iteration + 1,
        scenario: result.scenario,
        seed: iterationSeed,
        outcome: command.timedOut ? "timed-out" : command.exitCode === 0 ? "passed" : "failed",
        exitCode: command.exitCode,
        timedOut: command.timedOut,
        durationMs: command.durationMs,
        stdoutArtifact: command.stdoutArtifact,
        stderrArtifact: command.stderrArtifact,
        ...(executionArtifact ? { executionArtifact } : {}),
        ...(inputs ? { inputs } : {}),
      });
    }
  });
  await Promise.all(workers);
  result.failedIterations.sort((a, b) => a.iteration - b.iteration);
  result.executions.sort((a, b) => a.iteration - b.iteration);
  result.iterationResults.sort((a, b) => a.iteration - b.iteration);
  await writeJson(options.runRoot, "stability.json", result);
  return result;
}
