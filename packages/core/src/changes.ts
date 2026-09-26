import { isAncestor, resolveRef } from "./git.js";
import type { JointlyConfig, ChangePackage } from "./types.js";

export interface ResolvedChanges {
  baseCommit: string;
  changes: ChangePackage[];
}

export async function resolveChanges(repositoryRoot: string, config: JointlyConfig): Promise<ResolvedChanges> {
  const baseCommit = await resolveRef(repositoryRoot, config.base.ref);
  const changes: ChangePackage[] = [];
  for (const configured of config.changes) {
    const resolvedCommit = await resolveRef(repositoryRoot, configured.ref);
    if (!(await isAncestor(repositoryRoot, baseCommit, resolvedCommit))) {
      throw new Error(`change ${configured.id} (${configured.ref}) does not originate from base ${config.base.ref}`);
    }
    changes.push({
      id: configured.id,
      ref: configured.ref,
      resolvedCommit,
      promptPath: configured.promptFile,
    });
  }
  return { baseCommit, changes };
}
