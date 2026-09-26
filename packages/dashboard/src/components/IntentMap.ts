import { type Passport, requirements } from "../passport";
import { escapeHtml, requirementTags, section } from "./shared";

function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }

export function intentMap(passport: Passport): string {
  const intents = passport.intents ?? [];
  const sharedEntities = intents.length >= 2
    ? unique((intents[0]?.entities ?? []).filter((entity) => (intents[1]?.entities ?? []).includes(entity)))
    : [];
  const cards = passport.changes.map((change) => {
    const intent = intents.find((candidate) => candidate.changeId === change.id);
    const reqs = intent?.requirements ?? requirements(passport).filter((requirement) => requirement.id.toLowerCase().startsWith(change.id.split("-")[0]!));
    return `<article class="intent-card"><p class="kicker">${escapeHtml(change.id)}</p><h3>${escapeHtml(intent?.goal ?? change.ref)}</h3>
      <p class="prompt-ref">Source prompt · <code>${escapeHtml(change.promptPath ?? "Recorded in run manifest")}</code></p>
      <div class="tags">${requirementTags(reqs.map((requirement) => requirement.id))}</div>
      <dl><dt>Entities</dt><dd>${escapeHtml(unique(intent?.entities ?? reqs.flatMap((requirement) => requirement.entities ?? [])).join(" · ") || "Not recorded")}</dd>
      <dt>Side effects</dt><dd>${escapeHtml(unique(intent?.sideEffects ?? reqs.flatMap((requirement) => requirement.sideEffects ?? [])).join(" · ") || "Not recorded")}</dd></dl></article>`;
  }).join(`<div class="convergence"><span>Shared entities</span><strong>${escapeHtml(sharedEntities.join(" · ") || "Recorded surfaces")}</strong><i>↔</i></div>`);
  const reqRows = requirements(passport).map((requirement) => `<li><span class="tag">${escapeHtml(requirement.id)}</span><p>${escapeHtml(requirement.statement)}</p><small>${escapeHtml(requirement.type ?? "requirement")}</small></li>`).join("");
  return section("intent", "02 · Intent map", "Where independent intent converges.", `<div class="intent-map">${cards}</div><div class="panel requirement-list"><div class="panel-title"><h3>Requirement contract</h3><span>${requirements(passport).length} statements</span></div><ul>${reqRows || "<li>No requirements recorded</li>"}</ul></div>`);
}
