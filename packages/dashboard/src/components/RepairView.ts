import { type Passport } from "../passport";
import { escapeHtml, excerpt, section, statusPill } from "./shared";

function changedFiles(patch = ""): string[] {
  return [...new Set([...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((match) => match[1]!))];
}

export function repairView(passport: Passport): string {
  const before = passport.collisionEvidence?.beforeRepair;
  const after = passport.collisionEvidence?.afterRepair;
  const files = changedFiles(passport.repair).map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("");
  const decisions = passport.requirementResolutions?.map((resolution) => `<li><strong>${escapeHtml(resolution.id ?? "Decision")}</strong> · ${escapeHtml(resolution.decision ?? "unresolved")}<p>${escapeHtml(resolution.rationale ?? "No rationale recorded.")}</p>${resolution.proposedReplacement ? `<blockquote>${escapeHtml(resolution.proposedReplacement)}</blockquote>` : ""}<small>${escapeHtml(resolution.authority?.source ?? "No authority recorded")}</small></li>`).join("") ?? "";
  return section("repair", "04 · Repair", "A scoped candidate with requirement decisions disclosed.", `
    <div class="transition"><article class="before"><p class="kicker">Before repair</p><h3>${escapeHtml(before?.classification ?? "Collision")}</h3>${statusPill(false, "Replay rejected")}</article><div class="arrow" aria-label="repaired">→</div><article class="after"><p class="kicker">After repair</p><h3>${escapeHtml(after?.classification ?? "Verified")}</h3>${statusPill(after?.commandResult?.exitCode === 0, "Replay accepted")}</article></div>
    <div class="repair-grid"><article class="panel"><div class="panel-title"><h3>Root cause & resolution</h3></div><div class="prose">${escapeHtml(passport.repairSummary ?? "Repair summary not recorded.").replaceAll("\n", "<br>")}</div><h4>Modified files</h4><ul class="file-list">${files || "<li>See repair.patch</li>"}</ul></article>
    <article class="panel patch"><div class="panel-title"><h3>Verified diff</h3><span>Excerpt</span></div><pre><code>${escapeHtml(excerpt(passport.repair ?? "No patch recorded", 1100))}</code></pre>${passport.repair ? `<button type="button" data-passport-download="repair">Download repair patch</button>` : ""}</article></div>
    ${decisions ? `<article class="panel decision-disclosure"><div class="panel-title"><h3>Requirement decisions</h3><span>Operator authority required for material changes</span></div><ul>${decisions}</ul></article>` : ""}`);
}
