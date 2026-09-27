import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";
import {
  loadConfig,
  parseRunManifestArtifact,
  readJson,
  validateConfig,
  type JointlyConfig,
  type RunManifest,
  type WorkspacePreparation,
} from "@jointly/core";

const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export interface ToolContext {
  repositoryRoot: string;
}

export function createContext(repositoryRoot = process.env.JOINTLY_ROOT ?? process.cwd()): ToolContext {
  return { repositoryRoot: path.resolve(repositoryRoot) };
}

export function assertSafeRelativePath(value: string, label = "path"): string {
  if (!value || path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
    throw new Error(`${label} must be a non-empty relative path without '..'`);
  }
  return value;
}

export function resolveRunRoot(context: ToolContext, runId: string): string {
  if (!RUN_ID.test(runId)) throw new Error("invalid runId");
  return path.join(context.repositoryRoot, "runs", runId);
}

export async function loadRun(context: ToolContext, runId: string): Promise<{
  runRoot: string;
  manifest: RunManifest;
  config: JointlyConfig;
}> {
  const runRoot = resolveRunRoot(context, runId);
  const manifest = parseRunManifestArtifact(await readJson<unknown>(runRoot, "manifest.json")).value;
  const config = manifest.configSnapshot
    ? validateConfig(manifest.configSnapshot)
    : await loadConfig(path.join(context.repositoryRoot, "jointly.yaml"));
  return { runRoot, manifest, config };
}

export async function loadWorkspaces(runRoot: string): Promise<WorkspacePreparation> {
  return readJson<WorkspacePreparation>(runRoot, "workspaces.json");
}

export async function fileExists(filename: string): Promise<boolean> {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}

export async function readOptionalJson<T>(runRoot: string, relativePath: string): Promise<T | undefined> {
  assertSafeRelativePath(relativePath, "artifact path");
  try {
    return JSON.parse(await readFile(path.join(runRoot, relativePath), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function readOptionalValidatedJson<T>(
  runRoot: string,
  relativePath: string,
  schema: ZodType<T>,
): Promise<T | undefined> {
  const value = await readOptionalJson<unknown>(runRoot, relativePath);
  if (value === undefined) return undefined;
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `invalid ${relativePath}: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ")}`,
    );
  }
  return parsed.data;
}

export function redactSecrets(value: string): string {
  return value
    .replace(/((?:[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN))["']?\s*[:=]\s*["']?)[^\s"']+/g, "$1[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+/gi, "$1[REDACTED]");
}

export function bounded(value: string, maxBytes = 32 * 1024): string {
  const redacted = redactSecrets(value);
  const bytes = Buffer.from(redacted);
  return bytes.length <= maxBytes
    ? redacted
    : `${bytes.subarray(0, maxBytes).toString("utf8")}\n…[truncated]`;
}
