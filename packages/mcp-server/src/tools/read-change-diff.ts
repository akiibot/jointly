import { listChangedFiles, runGit } from "@jointly/core";
import type { ToolContext } from "../context.js";
import { bounded, loadRun } from "../context.js";

const SENSITIVE = /(^|\/)(\.env(?:\.|$)|.*(?:secret|credential|private[-_]?key).*)|\.(?:pem|p12|pfx|key)$/i;

export async function readChangeDiff(context: ToolContext, runId: string, changeId: string) {
  const { manifest } = await loadRun(context, runId);
  const change = manifest.changes.find((candidate) => candidate.id === changeId);
  if (!change) throw new Error(`unknown changeId: ${changeId}`);
  const changed = await listChangedFiles(
    context.repositoryRoot,
    manifest.resolvedBaseCommit,
    change.resolvedCommit,
  );
  const files = changed.filter((filename) => !SENSITIVE.test(filename));
  if (files.length === 0) {
    return { changeId, files, diff: "", truncated: false };
  }
  const result = await runGit(context.repositoryRoot, [
    "diff",
    "--no-ext-diff",
    "--unified=3",
    manifest.resolvedBaseCommit,
    change.resolvedCommit,
    "--",
    ...files,
  ]);
  if (result.exitCode !== 0) throw new Error(result.stderr || "unable to read change diff");
  return { changeId, files, diff: bounded(result.stdout), truncated: Buffer.byteLength(result.stdout) > 32 * 1024 };
}
