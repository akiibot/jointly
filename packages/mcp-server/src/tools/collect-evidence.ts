import path from "node:path";
import { linkEvidence, writeJson } from "@jointly/core";
import { fileExists, loadRun, readOptionalJson, type ToolContext } from "../context.js";

const EXISTING_WORKSPACES = ["base", "change-a", "change-b", "combined"] as const;

const ARTIFACTS = [
  "manifest.json",
  "workspaces.json",
  "test-results/existing.json",
  "collision-evidence.json",
  "collision-evidence.before-repair.json",
  "collision-evidence.after-repair.json",
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
  const existingEntries = await Promise.all(
    EXISTING_WORKSPACES.map(async (workspace) => [
      workspace,
      await readOptionalJson(runRoot, `test-results/${workspace}/result.json`),
    ] as const),
  );
  const existingResults = Object.fromEntries(existingEntries.filter((entry) => entry[1] !== undefined));
  if (Object.keys(existingResults).length > 0) {
    await writeJson(runRoot, "test-results/existing.json", existingResults);
  }
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
