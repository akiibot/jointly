import { type Passport, testMatrix } from "../passport";
import { escapeHtml, section, statusPill } from "./shared";

const labels: Record<string, string> = { base: "Common base", "change-a": "Change A", "change-b": "Change B", combined: "Combined" };

export function changeOverview(passport: Passport): string {
  const changes = passport.changes.map((change, index) => `<article class="change-card">
    <span class="change-index">0${index + 1}</span><div><p>${escapeHtml(change.id)}</p>
    <strong>${escapeHtml(change.ref)}</strong><code>${escapeHtml(change.resolvedCommit.slice(0, 8))}</code></div></article>`).join("");
  const rows = testMatrix(passport).map(({ workspace, result }) => {
    const passed = result.exitCode === 0 && result.timedOut !== true;
    return `<tr><td><strong>${escapeHtml(labels[workspace] ?? workspace)}</strong></td><td>${escapeHtml(result.durationMs ? `${result.durationMs} ms` : "Recorded")}</td><td>${statusPill(passed)}</td></tr>`;
  }).join("");
  return section("overview", "01 · Inputs", "Two changes. One shared base.", `
    <dl class="evidence-scope"><div><dt>Schema</dt><dd>${escapeHtml(passport.schemaVersion ?? "legacy")}</dd></div><div><dt>Verification basis</dt><dd>${escapeHtml(passport.verificationBasis ?? "not recorded")}</dd></div><div><dt>Input integrity</dt><dd>${passport.inputIntegrity?.valid === true ? "Current and verified" : passport.importStatus === "legacy-unverified" ? "Legacy · unverified" : "Not verified"}</dd></div><div><dt>Scenario</dt><dd>${escapeHtml(passport.stability?.scenario ?? "not recorded")}</dd></div></dl>
    <div class="change-grid">${changes}</div>
    <div class="panel"><div class="panel-title"><h3>Existing-test matrix</h3><span>Before interaction testing</span></div>
    <div class="table-scroll"><table><thead><tr><th>Workspace</th><th>Duration</th><th>Result</th></tr></thead><tbody>${rows || "<tr><td colspan=3>No test evidence recorded</td></tr>"}</tbody></table></div></div>`);
}
