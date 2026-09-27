import path from "node:path";
import {
  readJson,
  runGit,
  sha256,
  verifyRunInputIntegrity,
  writeJson,
  writeLog,
  type CollisionEvidence,
} from "@jointly/core";
import { loadRun, loadWorkspaces, type ToolContext } from "../context.js";

export async function exportResolutionPatch(context: ToolContext, runId: string) {
  const { runRoot, manifest, config } = await loadRun(context, runId);
  const inputIntegrity = await verifyRunInputIntegrity(manifest);
  if (!inputIntegrity.valid) {
    throw new Error("registered source refs, prompts, or configuration changed; repair export is stale");
  }
  const prepared = await loadWorkspaces(runRoot);
  const combined = prepared.workspaces.find((workspace) => workspace.name === "combined");
  if (!combined) throw new Error("combined workspace is not prepared");
  // Intent-to-add makes new files visible to `git diff` without staging their content.
  const intent = await runGit(combined.path, ["add", "-N", "--", "."]);
  if (intent.exitCode !== 0) throw new Error(intent.stderr || "unable to inspect new repair files");
  const [patch, names] = await Promise.all([
    runGit(combined.path, ["diff", "--binary", "HEAD", "--"]),
    runGit(combined.path, ["diff", "--name-only", "HEAD", "--"]),
  ]);
  if (patch.exitCode !== 0 || names.exitCode !== 0) {
    throw new Error(patch.stderr || names.stderr || "unable to export repair patch");
  }
  // Verify the current diff is anchored to the frozen combined HEAD by
  // checking that the exported patch reverses cleanly from the current tree.
  const changedFiles = names.stdout.trim().split("\n").filter(Boolean);
  let generatedDestination: string | undefined;
  try {
    const collision = await readJson<CollisionEvidence>(runRoot, "collision-evidence.before-repair.json");
    generatedDestination = path.posix.join(
      config.project.root === "." ? "" : config.project.root,
      "tests",
      "interaction",
      path.posix.basename(collision.testFile),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const normalizedGeneratedDestination = generatedDestination?.replace(/^\.\//, "");
  const regressionTestFiles = normalizedGeneratedDestination
    ? changedFiles.filter((file) => file === normalizedGeneratedDestination)
    : [];
  const productionFiles = changedFiles.filter((file) => !regressionTestFiles.includes(file));
  const projectPrefix = config.project.root === "." ? "" : `${config.project.root.replace(/\\/g, "/")}/`;
  const protectedTestChanges = productionFiles.filter((file) =>
    file.startsWith(`${projectPrefix}tests/`),
  );
  if (protectedTestChanges.length > 0) {
    throw new Error(`repair modifies protected existing tests: ${protectedTestChanges.join(", ")}`);
  }
  const preRepairTree = await runGit(combined.path, ["rev-parse", "HEAD^{tree}"]);
  if (preRepairTree.exitCode !== 0) throw new Error(preRepairTree.stderr || "unable to resolve combined tree");
  await writeLog(runRoot, "repair.patch", patch.stdout);
  const reverseCheck = await runGit(combined.path, [
    "apply",
    "--check",
    "--reverse",
    path.join(runRoot, "repair.patch"),
  ]);
  if (reverseCheck.exitCode !== 0) {
    throw new Error(reverseCheck.stderr || "repair patch is not bound to the current combined tree");
  }
  await writeJson(runRoot, "repair-metadata.json", {
    schemaVersion: "1",
    combinedCommit: combined.commit,
    preRepairTree: preRepairTree.stdout.trim(),
    patchDigest: sha256(patch.stdout),
    changedFiles,
    productionFiles,
    regressionTestFiles,
    sourceInputIntegrity: inputIntegrity,
  });
  return {
    artifact: "repair.patch",
    metadataArtifact: "repair-metadata.json",
    changedFiles,
    productionFiles,
    regressionTestFiles,
    bytes: Buffer.byteLength(patch.stdout),
    patchDigest: sha256(patch.stdout),
    sourceBranchesModified: !inputIntegrity.valid,
  };
}
