import { createManifest, loadConfig, validateConfig, type JointlyConfig } from "@jointly/core";
import path from "node:path";
import type { ToolContext } from "../context.js";

export interface RegisterRunInput {
  baseRef: string;
  changes: Array<{ id: string; ref: string; promptPath: string }>;
}

export async function registerRun(context: ToolContext, input: RegisterRunInput) {
  const stored = await loadConfig(path.join(context.repositoryRoot, "jointly.yaml"));
  const candidate: JointlyConfig = validateConfig({
    ...stored,
    base: { ref: input.baseRef },
    changes: input.changes.map((change) => ({
      id: change.id,
      ref: change.ref,
      promptFile: change.promptPath,
    })),
  });
  const { manifest, runRoot } = await createManifest(context.repositoryRoot, candidate);
  return {
    runId: manifest.runId,
    runRoot,
    baseRef: manifest.baseRef,
    resolvedBaseCommit: manifest.resolvedBaseCommit,
    changes: manifest.changes,
  };
}
