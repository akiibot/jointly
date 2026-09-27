import { createHash, randomBytes } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { resolveChanges } from "./changes.js";
import { writeJson } from "./evidence.js";
import type { JointlyConfig, RunManifest } from "./types.js";

export function createRunId(now = new Date(), entropy = randomBytes(8).toString("hex")): string {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const suffix = createHash("sha256").update(`${timestamp}:${entropy}`).digest("hex").slice(0, 8);
  return `${timestamp}-${suffix}`;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function digestPrompt(repositoryRoot: string, promptPath: string): Promise<string> {
  const repositoryRealPath = await realpath(repositoryRoot);
  const promptRealPath = await realpath(path.join(repositoryRoot, promptPath));
  const relative = path.relative(repositoryRealPath, promptRealPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`prompt file escapes repository: ${promptPath}`);
  }
  return sha256(await readFile(promptRealPath));
}

export async function createManifest(
  repositoryRoot: string,
  config: JointlyConfig,
  runsRoot = path.join(repositoryRoot, "runs"),
): Promise<{ manifest: RunManifest; runRoot: string }> {
  const resolved = await resolveChanges(repositoryRoot, config);
  const runId = createRunId();
  const runRoot = path.join(runsRoot, runId);
  const changes = await Promise.all(
    resolved.changes.map(async (change) => ({
      ...change,
      promptDigest: await digestPrompt(repositoryRoot, change.promptPath),
    })),
  );
  const manifest: RunManifest = {
    schemaVersion: "2",
    runId,
    createdAt: new Date().toISOString(),
    repositoryRoot,
    baseRef: config.base.ref,
    resolvedBaseCommit: resolved.baseCommit,
    resolvedBaseTree: resolved.baseTree,
    changes,
    commands: config.commands,
    ...(config.stability ? { stability: config.stability } : {}),
    configSnapshot: config,
    configDigest: sha256(JSON.stringify(config)),
  };
  await writeJson(runRoot, "manifest.json", manifest);
  return { manifest, runRoot };
}
