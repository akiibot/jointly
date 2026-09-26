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

export async function generatePassport(
  context: ToolContext,
  input: { runId: string; verdict: PassportVerdict; summary: string },
) {
  const { runRoot } = await loadRun(context, input.runId);
  const [testResults, canonicalCollisionEvidence, beforeRepair, afterRepair, stability] = await Promise.all([
    readOptionalJson(runRoot, "test-results/existing.json"),
    readOptionalJson(runRoot, "collision-evidence.json"),
    readOptionalJson(runRoot, "collision-evidence.before-repair.json"),
    readOptionalJson(runRoot, "collision-evidence.after-repair.json"),
    readOptionalJson(runRoot, "stability.json"),
  ]);
  const collisionEvidence = {
    beforeRepair: beforeRepair ?? canonicalCollisionEvidence,
    afterRepair,
  };
  let repair: unknown;
  try {
    repair = await readFile(path.join(runRoot, "repair.patch"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const passport = await assemblePassport(runRoot, {
    verdict: input.verdict,
    summary: input.summary,
    testResults,
    collisionEvidence,
    repair,
    stability,
  });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Jointly Merge Safety Passport</title><style>
body{font:16px/1.5 system-ui;margin:0;background:#0b1020;color:#e8ecf5}main{max-width:900px;margin:auto;padding:48px}
.card{background:#151d33;border:1px solid #2b385c;border-radius:16px;padding:24px;margin:18px 0}.verdict{font-size:2rem;font-weight:800;color:#7ee787}
code{color:#9cdcfe}li{margin:.5rem 0}</style></head><body><main>
<p>JOINTLY · MERGE SAFETY PASSPORT</p><h1>${escapeHtml(passport.summary)}</h1>
<section class="card"><div class="verdict">${escapeHtml(passport.verdict.replaceAll("_", " "))}</div>
<p>Run <code>${escapeHtml(passport.runId)}</code></p></section>
<section class="card"><h2>Changes analyzed</h2><ul>${passport.changes
    .map((change) => `<li><strong>${escapeHtml(change.id)}</strong> · <code>${escapeHtml(change.resolvedCommit.slice(0, 8))}</code></li>`)
    .join("")}</ul></section>
<section class="card"><h2>Evidence</h2><pre>${escapeHtml(JSON.stringify({ collisionEvidence, stability }, null, 2))}</pre></section>
</main></body></html>`;
  await writeFile(path.join(runRoot, "passport.html"), html, "utf8");
  return { verdict: passport.verdict, jsonArtifact: "passport.json", htmlArtifact: "passport.html" };
}
