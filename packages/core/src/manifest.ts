import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { resolveChanges } from "./changes.js";
import { writeJson } from "./evidence.js";
import type { JointlyConfig, RunManifest } from "./types.js";

export function createRunId(now = new Date(), entropy = randomBytes(8).toString("hex")): string {
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const suffix = createHash("sha256").update(`${timestamp}:${entropy}`).digest("hex").slice(0, 8);
  return `${timestamp}-${suffix}`;
}

export async function createManifest(
  repositoryRoot: string,
  config: JointlyConfig,
  runsRoot = path.join(repositoryRoot, "runs"),
): Promise<{ manifest: RunManifest; runRoot: string }> {
  const resolved = await resolveChanges(repositoryRoot, config);
  const runId = createRunId();
  const runRoot = path.join(runsRoot, runId);
  const manifest: RunManifest = {
    runId,
    createdAt: new Date().toISOString(),
    repositoryRoot,
    baseRef: config.base.ref,
    resolvedBaseCommit: resolved.baseCommit,
    changes: resolved.changes,
    commands: config.commands,
    ...(config.stability ? { stability: config.stability } : {}),
  };
  await writeJson(runRoot, "manifest.json", manifest);
  return { manifest, runRoot };
}
