import { access } from "node:fs/promises";
import { readJson, writeJson } from "./evidence.js";
import { PASSPORT_VERDICTS, type PassportVerdict, type RunManifest } from "./types.js";

export interface PassportInput {
  verdict: PassportVerdict;
  summary: string;
  requirements?: unknown[];
  intents?: unknown[];
  hypotheses?: unknown;
  testResults?: unknown;
  collisionEvidence?: unknown;
  repair?: unknown;
  repairSummary?: string;
  stability?: unknown;
  evidenceSummary?: unknown;
}

export interface MergeSafetyPassport extends PassportInput {
  runId: string;
  generatedAt: string;
  changes: RunManifest["changes"];
}

export function assertVerdict(value: string): asserts value is PassportVerdict {
  if (!(PASSPORT_VERDICTS as readonly string[]).includes(value)) {
    throw new Error(`unsupported passport verdict: ${value}`);
  }
}

async function fileExists(runRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(`${runRoot}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

function safeEvidenceIsComplete(input: PassportInput): boolean {
  const testResults = input.testResults as Record<string, { exitCode?: number; timedOut?: boolean }> | undefined;
  const requiredWorkspaces = ["base", "change-a", "change-b", "combined"];
  const existingPassed = requiredWorkspaces.every((workspace) => {
    const result = testResults?.[workspace];
    return result?.exitCode === 0 && result.timedOut === false;
  });
  const collisionEvidence = input.collisionEvidence as {
    beforeRepair?: { classification?: string };
    afterRepair?: { classification?: string; commandResult?: { exitCode?: number; timedOut?: boolean } };
  } | undefined;
  const beforeConfirmed = collisionEvidence?.beforeRepair?.classification === "confirmed-collision";
  const afterPassed =
    collisionEvidence?.afterRepair?.classification === "hypothesis-rejected" &&
    collisionEvidence.afterRepair.commandResult?.exitCode === 0 &&
    collisionEvidence.afterRepair.commandResult?.timedOut === false;
  const stability = input.stability as { iterations?: number; passed?: number; failed?: number } | undefined;
  const stabilityPassed =
    typeof stability?.iterations === "number" &&
    stability.iterations > 0 &&
    stability.failed === 0 &&
    stability.passed === stability.iterations;

  return Boolean(
    existingPassed &&
      beforeConfirmed &&
      afterPassed &&
      input.repair &&
      input.repairSummary &&
      input.intents?.length &&
      input.requirements?.length &&
      stabilityPassed,
  );
}

export async function assemblePassport(runRoot: string, input: PassportInput): Promise<MergeSafetyPassport> {
  assertVerdict(input.verdict);
  const manifest = await readJson<RunManifest>(runRoot, "manifest.json");
  if (input.verdict === "SAFE_TO_MERGE") {
    if (!safeEvidenceIsComplete(input)) {
      throw new Error("SAFE_TO_MERGE requires complete intent, test, collision, repair, and stability evidence");
    }
    if (!(await fileExists(runRoot, "repair.patch"))) {
      throw new Error("SAFE_TO_MERGE requires repair.patch");
    }
  }

  const passport: MergeSafetyPassport = {
    runId: manifest.runId,
    generatedAt: new Date().toISOString(),
    changes: manifest.changes,
    ...input,
  };
  await writeJson(runRoot, "passport.json", passport);
  return passport;
}
