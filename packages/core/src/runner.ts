import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
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
  maxLogBytes?: number;
  commandId?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

export interface ExecutedCommand extends CommandResult {
  stdout: string;
  stderr: string;
}

export const CHILD_ENVIRONMENT_POLICY_VERSION = "1";

const SAFE_PARENT_ENV_NAMES = [
  "PATH",
  "Path",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "COMSPEC",
  "ComSpec",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
] as const;

const FORBIDDEN_EXPLICIT_ENV_NAME =
  /(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|COOKIE|SESSION|SSH|AWS|AZURE|GOOGLE|GITHUB|GITLAB|WATSON|IBM_CLOUD|NPM_CONFIG_.*AUTH)/i;

interface ChildEnvironment {
  values: NodeJS.ProcessEnv;
  record: NonNullable<CommandResult["environmentPolicy"]>;
}

async function createChildEnvironment(options: RunCommandOptions): Promise<ChildEnvironment> {
  const environmentRoot = path.join(options.runRoot, "runtime-environment");
  const home = path.join(environmentRoot, "home");
  const temporary = path.join(environmentRoot, "tmp");
  await Promise.all([mkdir(home, { recursive: true }), mkdir(temporary, { recursive: true })]);

  const values: NodeJS.ProcessEnv = {};
  const inheritedNames: string[] = [];
  for (const name of SAFE_PARENT_ENV_NAMES) {
    const value = process.env[name];
    if (value !== undefined) {
      values[name] = value;
      inheritedNames.push(name);
    }
  }

  Object.assign(values, {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    XDG_CACHE_HOME: path.join(home, ".cache"),
    TMPDIR: temporary,
    TMP: temporary,
    TEMP: temporary,
    NPM_CONFIG_USERCONFIG: path.join(environmentRoot, "empty-npmrc"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
  });

  const explicitNames = Object.keys(options.env ?? {}).sort();
  const forbiddenName = explicitNames.find((name) => FORBIDDEN_EXPLICIT_ENV_NAME.test(name));
  if (forbiddenName) {
    throw new Error(`repository command environment variable is forbidden by policy: ${forbiddenName}`);
  }
  Object.assign(values, options.env);

  return {
    values,
    record: {
      version: CHILD_ENVIRONMENT_POLICY_VERSION,
      inheritedNames: inheritedNames.sort(),
      explicitNames,
    },
  };
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n…[truncated]`;
}

function appendBounded(value: string, chunk: string, maxBytes: number): { value: string; truncated: boolean } {
  const used = Buffer.byteLength(value);
  if (used >= maxBytes) return { value, truncated: true };
  const incoming = Buffer.from(chunk);
  const remaining = maxBytes - used;
  if (incoming.byteLength <= remaining) return { value: value + chunk, truncated: false };
  return { value: value + incoming.subarray(0, remaining).toString("utf8"), truncated: true };
}

function terminateProcessTree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", () => child.kill(signal));
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

export async function runCommand(options: RunCommandOptions): Promise<ExecutedCommand> {
  const commandId = options.commandId ?? randomUUID();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const maxCaptureBytes = options.maxCaptureBytes ?? 64 * 1024;
  const maxLogBytes = options.maxLogBytes ?? 1024 * 1024;
  const started = Date.now();
  const logDirectory = path.posix.join("test-results", options.workspace);
  const childEnvironment = await createChildEnvironment(options);

  return new Promise((resolve, reject) => {
    const child = spawn(options.command, {
      cwd: options.cwd,
      env: childEnvironment.values,
      shell: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let cancelled = false;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      const appended = appendBounded(stdout, chunk, maxLogBytes);
      stdout = appended.value;
      stdoutTruncated ||= appended.truncated;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      const appended = appendBounded(stderr, chunk, maxLogBytes);
      stderr = appended.value;
      stderrTruncated ||= appended.truncated;
    });
    child.on("error", reject);

    const timer = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child, "SIGTERM");
      setTimeout(() => terminateProcessTree(child, "SIGKILL"), 1_000).unref();
    }, timeoutMs);
    const cancel = () => {
      if (timedOut || cancelled) return;
      cancelled = true;
      terminateProcessTree(child, "SIGTERM");
      setTimeout(() => terminateProcessTree(child, "SIGKILL"), 1_000).unref();
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      try {
        const stdoutArtifact = await writeLog(
          options.runRoot,
          path.posix.join(logDirectory, `${commandId}.stdout.log`),
          stdoutTruncated ? `${stdout}\n…[log truncated]` : stdout,
        );
        const stderrArtifact = await writeLog(
          options.runRoot,
          path.posix.join(logDirectory, `${commandId}.stderr.log`),
          stderrTruncated ? `${stderr}\n…[log truncated]` : stderr,
        );
        resolve({
          commandId,
          workspace: options.workspace,
          command: options.command,
          exitCode: timedOut || cancelled ? null : code,
          timedOut,
          signal,
          terminationReason: timedOut ? "timeout" : cancelled ? "cancelled" : signal ? "signal" : "exit",
          durationMs: Date.now() - started,
          stdoutArtifact,
          stderrArtifact,
          environmentPolicy: childEnvironment.record,
          stdout: truncate(stdout, maxCaptureBytes),
          stderr: truncate(stderr, maxCaptureBytes),
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
