import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assemblePassport,
  computeWorkspaceStateDigest,
  collisionEvidenceSchema,
  evidenceSummarySchema,
  parseExistingTestSummaryArtifact,
  hypothesesArtifactSchema,
  intentContractSchema,
  repairMetadataSchema,
  requirementResolutionsArtifactSchema,
  runtimeDiagnosisSchema,
  repairReviewSchema,
  stabilityResultSchema,
  type PassportVerdict,
} from "@jointly/core";
import { loadRun, loadWorkspaces, readOptionalJson, readOptionalValidatedJson, type ToolContext } from "../context.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function jsonForHtml(value: unknown): string {
  return escapeHtml(JSON.stringify(value, null, 2) ?? "Not available");
}

export function exportedVerdictPresentation(verdict: PassportVerdict): {
  tone: "safe" | "danger" | "warning" | "blocked";
  label: string;
  explanation: string;
} {
  switch (verdict) {
    case "SAFE_TO_MERGE":
      return { tone: "safe", label: "SAFE TO MERGE", explanation: "Verified within tested scope: every required verification gate passed for this exact candidate and frozen input set." };
    case "COLLISION_CONFIRMED":
      return { tone: "danger", label: "COLLISION CONFIRMED", explanation: "A valid interaction test reproduced incompatible behavior. Do not merge this candidate." };
    case "REPAIR_REQUIRES_REVIEW":
      return { tone: "warning", label: "REPAIR REQUIRES REVIEW", explanation: "A repair was proposed, but the evidence is not sufficient for a safe verdict." };
    case "INDEPENDENT_CHANGE_FAILED":
      return { tone: "danger", label: "INDEPENDENT CHANGE FAILED", explanation: "At least one change failed independently, so combined compatibility cannot be assessed." };
    case "TEXTUAL_CONFLICT":
      return { tone: "danger", label: "TEXTUAL CONFLICT", explanation: "The changes do not merge cleanly. Resolve the Git conflict before behavioral verification." };
    case "INSUFFICIENT_EVIDENCE":
      return { tone: "blocked", label: "INSUFFICIENT EVIDENCE", explanation: "Required execution or evidence gates are missing, stale, or incomplete." };
  }
}

async function includeGeneratedTestSource(runRoot: string, evidence: unknown): Promise<unknown> {
  if (!evidence || typeof evidence !== "object") return evidence;
  const record = evidence as Record<string, unknown>;
  const testFile =
    typeof record.executedTestArtifact === "string"
      ? record.executedTestArtifact
      : typeof record.testFile === "string"
        ? record.testFile
        : undefined;
  if (!testFile?.startsWith("generated-tests/") || testFile.includes("..")) return evidence;
  try {
    return { ...record, generatedTestSource: await readFile(path.join(runRoot, testFile), "utf8") };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return evidence;
  }
}

export async function generatePassport(
  context: ToolContext,
  input: {
    runId: string;
    verdict: PassportVerdict;
    summary: string;
    verificationBasis?: "repaired-collision" | "compatible-pair";
  },
) {
  const { runRoot, manifest } = await loadRun(context, input.runId);
  const prepared = await loadWorkspaces(runRoot);
  const workspaceStateDigests = Object.fromEntries(
    await Promise.all(prepared.workspaces.map(async (workspace) => [
      workspace.name,
      await computeWorkspaceStateDigest(workspace.path),
    ])),
  );
  const rawExistingTests = await readOptionalJson<unknown>(runRoot, "test-results/existing.json");
  const [testResults, canonicalCollisionEvidence, beforeRepair, afterRepair, stability, hypotheses, evidenceSummary, repairMetadata, requirementResolutions, runtimeDiagnosis, repairReview] = await Promise.all([
    Promise.resolve(rawExistingTests === undefined ? undefined : parseExistingTestSummaryArtifact(rawExistingTests).value),
    readOptionalValidatedJson(runRoot, "collision-evidence.json", collisionEvidenceSchema),
    readOptionalValidatedJson(runRoot, "collision-evidence.before-repair.json", collisionEvidenceSchema),
    readOptionalValidatedJson(runRoot, "collision-evidence.after-repair.json", collisionEvidenceSchema),
    readOptionalValidatedJson(runRoot, "stability.json", stabilityResultSchema),
    readOptionalValidatedJson(runRoot, "hypotheses.json", hypothesesArtifactSchema),
    readOptionalValidatedJson(runRoot, "evidence-summary.json", evidenceSummarySchema),
    readOptionalValidatedJson(runRoot, "repair-metadata.json", repairMetadataSchema),
    readOptionalValidatedJson(runRoot, "requirement-resolutions.json", requirementResolutionsArtifactSchema),
    readOptionalValidatedJson(runRoot, "runtime-diagnosis.json", runtimeDiagnosisSchema),
    readOptionalValidatedJson(runRoot, "repair-review.json", repairReviewSchema),
  ]);
  const intents = (
    await Promise.all(manifest.changes.map((change) => readOptionalValidatedJson(runRoot, `intents/${change.id}.json`, intentContractSchema)))
  ).filter((intent) => intent !== undefined) as Array<{ changeId?: string; requirements?: unknown[] }>;
  const requirements = intents.flatMap((intent) =>
    (intent.requirements ?? []).map((requirement) => ({ changeId: intent.changeId, requirement })),
  );
  const collisionEvidence = {
    beforeRepair: await includeGeneratedTestSource(runRoot, beforeRepair ?? canonicalCollisionEvidence),
    afterRepair: await includeGeneratedTestSource(runRoot, afterRepair),
  };
  let repair: unknown;
  let repairSummary: string | undefined;
  try {
    repair = await readFile(path.join(runRoot, "repair.patch"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    repairSummary = await readFile(path.join(runRoot, "repair-summary.md"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const passport = await assemblePassport(runRoot, {
    verdict: input.verdict,
    verificationBasis: input.verificationBasis,
    summary: input.summary,
    requirements,
    intents,
    hypotheses,
    testResults,
    collisionEvidence,
    runtimeDiagnosis,
    repairReview,
    repair,
    repairMetadata,
    repairSummary,
    stability,
    evidenceSummary,
    requirementResolutions,
    workspaceStateDigests,
  });
  const requirementsView = intents.map((intent) => ({
    changeId: intent.changeId,
    requirementIds: (intent.requirements ?? []).map((requirement) =>
      typeof requirement === "object" && requirement !== null && "id" in requirement
        ? (requirement as { id: unknown }).id
        : "unknown",
    ),
  }));
  const resolutionView = Array.isArray(requirementResolutions)
    ? requirementResolutions.map((resolution) => ({
        id: resolution.id,
        status: resolution.decision === "unresolved" ? "awaiting-authority" : "authorized",
        preservedOriginalStatements: resolution.originalStatements,
        decision: resolution.decision,
        revisedContract: resolution.proposedReplacement ?? "No replacement; both originals remain applicable",
        rationale: resolution.rationale,
        authority: resolution.authority ?? "Not yet supplied",
        affectedTests: resolution.affectedTests,
    }))
    : [];
  const verdictPresentation = exportedVerdictPresentation(passport.verdict);
  const verificationFailures = passport.verificationGates.failures;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Jointly Merge Safety Passport</title><style>
body{font:16px/1.5 system-ui;margin:0;background:#0b1020;color:#e8ecf5}main{max-width:900px;margin:auto;padding:48px}
.card{background:#151d33;border:1px solid #2b385c;border-radius:16px;padding:24px;margin:18px 0}.verdict{font-size:2rem;font-weight:800}
.verdict-card.safe{border-color:#3fb950}.verdict.safe{color:#7ee787}.verdict-card.danger{border-color:#f85149}.verdict.danger{color:#ff7b72}
.verdict-card.warning,.verdict-card.blocked{border-color:#d29922}.verdict.warning,.verdict.blocked{color:#e3b341}.blockers{color:#ffdf8b}
code{color:#9cdcfe}li{margin:.5rem 0}</style></head><body><main>
<p>JOINTLY · MERGE SAFETY PASSPORT</p><h1>${escapeHtml(passport.summary)}</h1>
<section class="card verdict-card ${verdictPresentation.tone}" role="status"><div class="verdict ${verdictPresentation.tone}">${escapeHtml(verdictPresentation.label)}</div>
<p>${escapeHtml(verdictPresentation.explanation)}</p><p>Run <code>${escapeHtml(passport.runId)}</code></p>
${verificationFailures.length ? `<div class="blockers"><strong>Verification blockers</strong><ul>${verificationFailures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join("")}</ul></div>` : ""}</section>
<section class="card"><h2>1. Inputs</h2><ul>${passport.changes
    .map((change) => `<li><strong>${escapeHtml(change.id)}</strong> · <code>${escapeHtml(change.resolvedCommit.slice(0, 8))}</code></li>`)
    .join("")}</ul></section>
<section class="card"><h2>2. Intent requirements</h2><pre>${jsonForHtml(requirementsView)}</pre></section>
<section class="card"><h2>3. Existing tests</h2><pre>${jsonForHtml(testResults)}</pre></section>
<section class="card"><h2>4. Collision evidence</h2><pre>${jsonForHtml(collisionEvidence)}</pre></section>
<section class="card"><h2>5. Requirement decisions</h2><pre>${jsonForHtml(resolutionView)}</pre></section>
<section class="card"><h2>6. Repair</h2><pre>${escapeHtml(repairSummary ?? "Missing repair summary")}</pre></section>
<section class="card"><h2>7. Stability</h2><pre>${jsonForHtml(stability)}</pre></section>
</main></body></html>`;
  await writeFile(path.join(runRoot, "passport.html"), html, "utf8");
  return { verdict: passport.verdict, jsonArtifact: "passport.json", htmlArtifact: "passport.html" };
}
