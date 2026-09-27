import { type Passport, testMatrix } from "../passport";
import { escapeHtml, section } from "./shared";

const presentations: Record<string, { tone: "safe" | "danger" | "warning" | "blocked"; label: string; explanation: string }> = {
  SAFE_TO_MERGE: { tone: "safe", label: "SAFE TO MERGE", explanation: "Verified within tested scope: every required verification gate passed for this exact candidate and frozen input set." },
  COLLISION_CONFIRMED: { tone: "danger", label: "COLLISION CONFIRMED", explanation: "A valid interaction test reproduced incompatible behavior. Do not merge this candidate." },
  REPAIR_REQUIRES_REVIEW: { tone: "warning", label: "REPAIR REQUIRES REVIEW", explanation: "A repair was proposed, but the evidence is not sufficient for a safe verdict." },
  INDEPENDENT_CHANGE_FAILED: { tone: "danger", label: "INDEPENDENT CHANGE FAILED", explanation: "At least one change failed independently, so combined compatibility cannot be assessed." },
  TEXTUAL_CONFLICT: { tone: "danger", label: "TEXTUAL CONFLICT", explanation: "The changes do not merge cleanly. Resolve the Git conflict before behavioral verification." },
  INSUFFICIENT_EVIDENCE: { tone: "blocked", label: "INSUFFICIENT EVIDENCE", explanation: "Required execution or evidence gates are missing, stale, or incomplete." },
};

export function verdictPresentation(passport: Passport): { tone: "safe" | "danger" | "warning" | "blocked" | "unverified"; label: string; explanation: string; symbol: string } {
  if (passport.importStatus === "legacy-unverified") {
    return {
      tone: "unverified", symbol: "?",
      label: `LEGACY UNVERIFIED · RECORDED ${passport.verdict.replaceAll("_", " ")}`,
      explanation: "This historical passport predates current verification gates and has not been upgraded.",
    };
  }
  if (passport.verdict === "SAFE_TO_MERGE" && passport.verificationGates?.passed !== true) {
    return { tone: "unverified", symbol: "!", label: "SAFE CLAIM NOT VERIFIED", explanation: "The recorded safe claim does not have passing verification gates." };
  }
  const presentation = presentations[passport.verdict]!;
  return { ...presentation, symbol: presentation.tone === "safe" ? "✓" : presentation.tone === "warning" ? "△" : "!" };
}

export function passportView(passport: Passport): string {
  const tests = testMatrix(passport);
  const passed = tests.filter(({ result }) => result.exitCode === 0 && result.timedOut !== true).length;
  const stability = passport.stability;
  const presentation = verdictPresentation(passport);
  const failures = passport.verificationGates?.failures ?? [];
  return section("passport", "05 · Passport", "Evidence, sealed into a decision.", `
    <div class="passport-card ${presentation.tone}" role="status" aria-live="polite"><div><p class="kicker">${passport.importStatus === "legacy-unverified" ? "Historical record · not upgraded" : "Final verdict"}</p><h3>${escapeHtml(presentation.label)}</h3><p>${escapeHtml(presentation.explanation)}</p><p>${escapeHtml(passport.summary)}</p></div><div class="seal" aria-hidden="true">${presentation.symbol}</div></div>
    ${failures.length ? `<div class="gate-failures"><h4>Verification blockers</h4><ul>${failures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join("")}</ul></div>` : ""}
    <div class="metric-grid"><article><strong>${passed}/${tests.length}</strong><span>workspaces passing</span></article><article><strong>${escapeHtml(`${stability?.passed ?? 0}/${stability?.iterations ?? 0}`)}</strong><span>stability iterations</span></article><article><strong>${escapeHtml(stability?.failed ?? 0)}</strong><span>flaky failures</span></article><article><strong>${escapeHtml(stability?.seed ?? "—")}</strong><span>fixed seed</span></article></div>
    <footer class="run-footer"><span>Run ID</span><code>${escapeHtml(passport.runId)}</code><span>Generated</span><time>${escapeHtml(passport.generatedAt ? new Date(passport.generatedAt).toLocaleString() : "Recorded in passport")}</time></footer>`);
}
