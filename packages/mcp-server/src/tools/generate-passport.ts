import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assemblePassport, type PassportVerdict } from "@jointly/core";
import { loadRun, readOptionalJson, type ToolContext } from "../context.js";

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

export async function generatePassport(
  context: ToolContext,
  input: { runId: string; verdict: PassportVerdict; summary: string },
) {
  const { runRoot, manifest } = await loadRun(context, input.runId);
  const [testResults, canonicalCollisionEvidence, beforeRepair, afterRepair, stability, hypotheses, evidenceSummary] = await Promise.all([
    readOptionalJson(runRoot, "test-results/existing.json"),
    readOptionalJson(runRoot, "collision-evidence.json"),
    readOptionalJson(runRoot, "collision-evidence.before-repair.json"),
    readOptionalJson(runRoot, "collision-evidence.after-repair.json"),
    readOptionalJson(runRoot, "stability.json"),
    readOptionalJson(runRoot, "hypotheses.json"),
    readOptionalJson(runRoot, "evidence-summary.json"),
  ]);
  const intents = (
    await Promise.all(manifest.changes.map((change) => readOptionalJson(runRoot, `intents/${change.id}.json`)))
  ).filter((intent) => intent !== undefined) as Array<{ changeId?: string; requirements?: unknown[] }>;
  const requirements = intents.flatMap((intent) =>
    (intent.requirements ?? []).map((requirement) => ({ changeId: intent.changeId, requirement })),
  );
  const collisionEvidence = {
    beforeRepair: beforeRepair ?? canonicalCollisionEvidence,
    afterRepair,
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
    summary: input.summary,
    requirements,
    intents,
    hypotheses,
    testResults,
    collisionEvidence,
    repair,
    repairSummary,
    stability,
    evidenceSummary,
  });
  const requirementsView = intents.map((intent) => ({
    changeId: intent.changeId,
    requirementIds: (intent.requirements ?? []).map((requirement) =>
      typeof requirement === "object" && requirement !== null && "id" in requirement
        ? (requirement as { id: unknown }).id
        : "unknown",
    ),
  }));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Jointly Merge Safety Passport</title><style>
body{font:16px/1.5 system-ui;margin:0;background:#0b1020;color:#e8ecf5}main{max-width:900px;margin:auto;padding:48px}
.card{background:#151d33;border:1px solid #2b385c;border-radius:16px;padding:24px;margin:18px 0}.verdict{font-size:2rem;font-weight:800;color:#7ee787}
code{color:#9cdcfe}li{margin:.5rem 0}</style></head><body><main>
<p>JOINTLY · MERGE SAFETY PASSPORT</p><h1>${escapeHtml(passport.summary)}</h1>
<section class="card"><div class="verdict">${escapeHtml(passport.verdict.replaceAll("_", " "))}</div>
<p>Run <code>${escapeHtml(passport.runId)}</code></p></section>
<section class="card"><h2>1. Inputs</h2><ul>${passport.changes
    .map((change) => `<li><strong>${escapeHtml(change.id)}</strong> · <code>${escapeHtml(change.resolvedCommit.slice(0, 8))}</code></li>`)
    .join("")}</ul></section>
<section class="card"><h2>2. Intent requirements</h2><pre>${jsonForHtml(requirementsView)}</pre></section>
<section class="card"><h2>3. Existing tests</h2><pre>${jsonForHtml(testResults)}</pre></section>
<section class="card"><h2>4. Collision evidence</h2><pre>${jsonForHtml(collisionEvidence)}</pre></section>
<section class="card"><h2>5. Repair</h2><pre>${escapeHtml(repairSummary ?? "Missing repair summary")}</pre></section>
<section class="card"><h2>6. Stability</h2><pre>${jsonForHtml(stability)}</pre></section>
</main></body></html>`;
  await writeFile(path.join(runRoot, "passport.html"), html, "utf8");
  return { verdict: passport.verdict, jsonArtifact: "passport.json", htmlArtifact: "passport.html" };
}
