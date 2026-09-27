import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { resolveRef, resolveTree } from "./git.js";
import { sha256 } from "./manifest.js";
import type { RunManifest } from "./types.js";

export interface ProvenanceCheck {
  name: string;
  ok: boolean;
  expected?: string;
  actual?: string;
  reason?: string;
}

export interface RunInputIntegrity {
  valid: boolean;
  checks: ProvenanceCheck[];
}

async function repositoryFileDigest(repositoryRoot: string, relativePath: string): Promise<string> {
  const root = await realpath(repositoryRoot);
  const target = await realpath(path.join(repositoryRoot, relativePath));
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`file escapes repository: ${relativePath}`);
  }
  return sha256(await readFile(target));
}

async function checked(
  name: string,
  expected: string | undefined,
  operation: () => Promise<string>,
): Promise<ProvenanceCheck> {
  if (!expected) return { name, ok: false, reason: "expected fingerprint is unavailable" };
  try {
    const actual = await operation();
    return { name, ok: actual === expected, expected, actual };
  } catch (error) {
    return { name, ok: false, expected, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function verifyRunInputIntegrity(manifest: RunManifest): Promise<RunInputIntegrity> {
  const checks: ProvenanceCheck[] = [];
  checks.push({
    name: "manifest.schemaVersion",
    ok: manifest.schemaVersion === "2",
    expected: "2",
    actual: manifest.schemaVersion ?? "legacy",
  });
  checks.push({
    name: "manifest.configDigest",
    ok:
      Boolean(manifest.configSnapshot && manifest.configDigest) &&
      sha256(JSON.stringify(manifest.configSnapshot)) === manifest.configDigest,
    expected: manifest.configDigest,
    actual: manifest.configSnapshot ? sha256(JSON.stringify(manifest.configSnapshot)) : undefined,
    ...(!manifest.configSnapshot || !manifest.configDigest
      ? { reason: "frozen configuration is unavailable" }
      : {}),
  });
  checks.push(
    await checked("base.ref", manifest.resolvedBaseCommit, () =>
      resolveRef(manifest.repositoryRoot, manifest.baseRef),
    ),
  );
  checks.push(
    await checked("base.tree", manifest.resolvedBaseTree, () =>
      resolveTree(manifest.repositoryRoot, manifest.resolvedBaseCommit),
    ),
  );

  for (const change of manifest.changes) {
    checks.push(
      await checked(`change.${change.id}.ref`, change.resolvedCommit, () =>
        resolveRef(manifest.repositoryRoot, change.ref),
      ),
    );
    checks.push(
      await checked(`change.${change.id}.tree`, change.resolvedTree, () =>
        resolveTree(manifest.repositoryRoot, change.resolvedCommit),
      ),
    );
    checks.push(
      await checked(`change.${change.id}.prompt`, change.promptDigest, () =>
        repositoryFileDigest(manifest.repositoryRoot, change.promptPath),
      ),
    );
  }

  return { valid: checks.every((check) => check.ok), checks };
}
