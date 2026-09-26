import path from "node:path";
import { linkEvidence, writeJson } from "@jointly/core";
import { fileExists, loadRun, type ToolContext } from "../context.js";

const ARTIFACTS = [
  "manifest.json",
  "workspaces.json",
  "test-results/existing.json",
  "collision-evidence.json",
  "repair.patch",
  "stability.json",
  "passport.json",
] as const;

export async function collectEvidence(
  context: ToolContext,
  runId: string,
  requirementIds: string[] = [],
) {
  const { runRoot } = await loadRun(context, runId);
  const artifacts = await Promise.all(
    ARTIFACTS.map(async (artifact) => ({ artifact, exists: await fileExists(path.join(runRoot, artifact)) })),
  );
  const available = artifacts.filter((entry) => entry.exists).map((entry) => entry.artifact);
  const summary = {
    runId,
    artifacts,
    requirementLinks: available.flatMap((artifact) => linkEvidence(requirementIds, artifact)),
    missingRequired: artifacts
      .filter((entry) => ["manifest.json", "workspaces.json", "test-results/existing.json"].includes(entry.artifact))
      .filter((entry) => !entry.exists)
      .map((entry) => entry.artifact),
  };
  await writeJson(runRoot, "evidence-summary.json", summary);
  return summary;
}
