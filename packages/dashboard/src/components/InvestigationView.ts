import { type CollisionResult, type Passport } from "../passport";
import { escapeHtml, excerpt, requirementTags, section, statusPill } from "./shared";

function firstHypothesis(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {};
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.hypotheses)) return (object.hypotheses[0] as Record<string, unknown>) ?? {};
    return object;
  }
  return {};
}

export function investigationView(passport: Passport): string {
  const evidence: CollisionResult = passport.collisionEvidence?.beforeRepair ?? {};
  const hypothesis = firstHypothesis(passport.hypotheses);
  const reqIds = evidence.requirementIds ?? (Array.isArray(hypothesis.requirementIds) ? hypothesis.requirementIds as string[] : []);
  const confirmed = evidence.classification === "confirmed-collision";
  const testSource = evidence.generatedTestSource ?? evidence.testFile ?? "Generated interaction test recorded in run evidence";
  const failure = evidence.commandResult?.stdout ?? evidence.observed ?? "No failure excerpt recorded.";
  return section("investigation", "03 · Investigation", "The tests passed. The intents collided.", `
    <div class="finding"><div><p class="kicker">Ranked hypothesis · ${escapeHtml(evidence.hypothesisId ?? hypothesis.id ?? "H-001")}</p>
    <h3>${escapeHtml(hypothesis.explanation ?? passport.summary)}</h3><div class="tags">${requirementTags(reqIds)}</div></div>${statusPill(confirmed, evidence.classification ?? "Evidence recorded")}</div>
    <div class="evidence-grid"><article class="panel"><div class="panel-title"><h3>Generated test</h3><span>${escapeHtml(evidence.testFile ?? "interaction test")}</span></div><pre><code>${escapeHtml(excerpt(testSource, 560))}</code></pre></article>
    <article class="panel compare"><div><p class="kicker">Expected</p><p>${escapeHtml(evidence.expected ?? "Expected behavior recorded by the investigation")}</p></div><div class="observed"><p class="kicker">Observed</p><p>${escapeHtml(evidence.observed ?? "Observed behavior violated the combined intent")}</p></div></article></div>
    <details><summary>Failure excerpt</summary><pre><code>${escapeHtml(excerpt(failure))}</code></pre></details>`);
}
