import { type Passport, testMatrix } from "../passport";
import { escapeHtml, section } from "./shared";

export function passportView(passport: Passport): string {
  const tests = testMatrix(passport);
  const passed = tests.filter(({ result }) => result.exitCode === 0 && result.timedOut !== true).length;
  const stability = passport.stability;
  const safe = passport.verdict === "SAFE_TO_MERGE";
  return section("passport", "05 · Passport", "Evidence, sealed into a decision.", `
    <div class="passport-card ${safe ? "safe" : "review"}"><div><p class="kicker">Final verdict</p><h3>${escapeHtml(passport.verdict.replaceAll("_", " "))}</h3><p>${escapeHtml(passport.summary)}</p></div><div class="seal" aria-hidden="true">${safe ? "✓" : "!"}</div></div>
    <div class="metric-grid"><article><strong>${passed}/${tests.length}</strong><span>workspaces passing</span></article><article><strong>${escapeHtml(`${stability?.passed ?? 0}/${stability?.iterations ?? 0}`)}</strong><span>stability iterations</span></article><article><strong>${escapeHtml(stability?.failed ?? 0)}</strong><span>flaky failures</span></article><article><strong>${escapeHtml(stability?.seed ?? "—")}</strong><span>fixed seed</span></article></div>
    <footer class="run-footer"><span>Run ID</span><code>${escapeHtml(passport.runId)}</code><span>Generated</span><time>${escapeHtml(passport.generatedAt ? new Date(passport.generatedAt).toLocaleString() : "Recorded in passport")}</time></footer>`);
}
