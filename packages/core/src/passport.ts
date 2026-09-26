import { access } from "node:fs/promises";
import { readJson, writeJson } from "./evidence.js";
import { PASSPORT_VERDICTS, type PassportVerdict, type RunManifest } from "./types.js";

export interface PassportInput {
  verdict: PassportVerdict;
  summary: string;
  requirements?: unknown[];
  testResults?: unknown;
  collisionEvidence?: unknown;
  repair?: unknown;
  stability?: unknown;
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

export async function assemblePassport(runRoot: string, input: PassportInput): Promise<MergeSafetyPassport> {
  assertVerdict(input.verdict);
  const manifest = await readJson<RunManifest>(runRoot, "manifest.json");
  if (input.verdict === "SAFE_TO_MERGE") {
    const stability = input.stability as { failed?: number } | undefined;
    if (!input.testResults || !input.collisionEvidence || !input.repair || !stability || stability.failed !== 0) {
      throw new Error(
        "SAFE_TO_MERGE requires existing-test, collision, repair, and zero-failure stability evidence",
      );
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
