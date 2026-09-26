import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { writeLog } from "./evidence.js";
import type { CommandResult, WorkspaceName } from "./types.js";

export interface RunCommandOptions {
  cwd: string;
  command: string;
  workspace: WorkspaceName;
  runRoot: string;
  timeoutMs?: number;
  maxCaptureBytes?: number;
  commandId?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ExecutedCommand extends CommandResult {
  stdout: string;
  stderr: string;
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n…[truncated]`;
}

export async function runCommand(options: RunCommandOptions): Promise<ExecutedCommand> {
  const commandId = options.commandId ?? randomUUID();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const maxCaptureBytes = options.maxCaptureBytes ?? 64 * 1024;
  const started = Date.now();
  const logDirectory = path.posix.join("test-results", options.workspace);

  return new Promise((resolve, reject) => {
    const child = spawn(options.command, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
    }, timeoutMs);

    child.on("close", async (code) => {
      clearTimeout(timer);
      try {
        const stdoutArtifact = await writeLog(
          options.runRoot,
          path.posix.join(logDirectory, `${commandId}.stdout.log`),
          stdout,
        );
        const stderrArtifact = await writeLog(
          options.runRoot,
          path.posix.join(logDirectory, `${commandId}.stderr.log`),
          stderr,
        );
        resolve({
          commandId,
          workspace: options.workspace,
          command: options.command,
          exitCode: timedOut ? null : code,
          timedOut,
          durationMs: Date.now() - started,
          stdoutArtifact,
          stderrArtifact,
          stdout: truncate(stdout, maxCaptureBytes),
          stderr: truncate(stderr, maxCaptureBytes),
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
