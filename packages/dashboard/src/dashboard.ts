import type { Passport } from "./passport";
import { changeOverview } from "./components/ChangeOverview";
import { intentMap } from "./components/IntentMap";
import { investigationView } from "./components/InvestigationView";
import { repairView } from "./components/RepairView";
import { passportView } from "./components/PassportView";
import { howItWorks } from "./components/HowItWorks";
import { roadmapView } from "./components/RoadmapView";
import { escapeHtml } from "./components/shared";
import { modeBanner, modeNavigation, type DashboardContext } from "./modes";
import { classifyLocalRun, type LocalCapabilities, type LocalFailureKind, type LocalPreflight, type LocalRefs, type LocalRunEvent, type LocalRunSummary } from "./local-client";

const failureLabels: Record<LocalFailureKind, string> = {
  "invalid-input": "Invalid request",
  "unavailable-backend": "Backend unavailable",
  "authentication-failure": "Authentication failed",
  "budget-exhausted": "Budget exhausted",
  "test-setup-failed": "Test setup failed",
  collision: "Collision found",
  interrupted: "Run interrupted",
  unknown: "Run failed",
};

export function renderDashboard(passport: Passport, context: DashboardContext = { mode: "imported", source: "passport data" }): string {
  return `<header class="masthead"><a class="brand" href="#overview" aria-label="Jointly dashboard home"><span aria-hidden="true">J</span><strong>JOINTLY</strong></a>
    <nav aria-label="Dashboard sections"><a href="#how-it-works">How it works</a><a href="#overview">Overview</a><a href="#intent">Intent</a><a href="#investigation">Investigation</a><a href="#repair">Repair</a><a href="#passport">Passport</a><a href="#roadmap">Roadmap</a></nav>
    <div class="masthead-actions"><a class="repo-link" href="https://github.com/akiibot/jointly" target="_blank" rel="noopener noreferrer" aria-label="View Jointly on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.64-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.97a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/></svg><span>View on GitHub</span><i aria-hidden="true">↗</i></a><label class="upload"><input id="passport-file" type="file" accept="application/json,.json"><span>Open passport</span></label></div></header>
    <main>${modeNavigation(context.mode)}${modeBanner(context)}<div class="evidence-actions"><button type="button" data-passport-download="passport">Download validated passport</button></div><section class="hero">
      <div class="hero-copy"><p class="eyebrow">Intent-aware pre-merge verification</p><h1><span>Evidence</span><em>before merge.</em></h1><p class="hero-line">Catch the interaction your tests missed.</p><p class="lede">${escapeHtml(passport.summary)}</p><div class="hero-meta"><span>Built with IBM Bob</span><span>AI proposes · Evidence decides</span></div></div>
      <div class="merge-story" aria-label="Two independently validated changes converge, reveal a collision, and emerge as verified evidence">
        <div class="branch branch-a"><span class="branch-label">Change A</span><i aria-hidden="true">✓</i></div>
        <div class="branch branch-b"><span class="branch-label">Change B</span><i aria-hidden="true">✓</i></div>
        <div class="collision-node"><span>hidden<br>collision</span></div>
        <div class="verified-node"><i aria-hidden="true">✓</i><span>verified evidence</span></div>
      </div>
      <aside><span>Evidence run</span><code>${escapeHtml(passport.runId)}</code><span>Two-change MVP</span></aside>
    </section>
    ${howItWorks()}${changeOverview(passport)}${intentMap(passport)}${investigationView(passport)}${repairView(passport)}${passportView(passport)}${roadmapView()}</main>`;
}

export function renderError(message: string): string {
  return `<main class="error-state"><div class="error-mark">!</div><p class="eyebrow">Passport unavailable</p><h1>We could not open this investigation.</h1><p>${escapeHtml(message)}</p><label class="upload prominent"><input id="passport-file" type="file" accept="application/json,.json"><span>Choose passport.json</span></label><small>No analysis happens in this dashboard. It only presents an existing Jointly passport.</small></main>`;
}

export function renderImportMode(message?: string): string {
  return `<main class="mode-shell">${modeNavigation("imported")}<section class="mode-card"><p class="eyebrow">Imported passport</p><h1>Open evidence you already trust.</h1>
    <p>This viewer validates and renders a passport file. It does not run analysis and will never replace an import failure with the bundled successful sample.</p>
    ${message ? `<p class="mode-error" role="alert">${escapeHtml(message)}</p>` : ""}
    <label class="upload prominent"><input id="passport-file" type="file" accept="application/json,.json"><span>Choose passport.json</span></label></section></main>`;
}

export function renderLocalMode(state: {
  status: "checking" | "ready" | "unavailable";
  capabilities?: LocalCapabilities;
  preflight?: LocalPreflight;
  refs?: LocalRefs;
  runs?: LocalRunSummary[];
  events?: LocalRunEvent[];
  error?: string;
  errorKind?: LocalFailureKind;
}): string {
  const failingChecks = state.preflight?.checks.filter((check) => check.status !== "pass") ?? [];
  const history = state.runs?.length
    ? `<ul class="run-history">${state.runs.map((run) => {
      const failureKind = classifyLocalRun(run);
      const passportAvailable = run.status === "completed" && Boolean(run.verdict);
      const runId = encodeURIComponent(run.runId);
      const action = run.status === "running" || run.status === "queued"
        ? `<button type="button" data-local-action="cancel" data-run-id="${escapeHtml(run.runId)}">Cancel simulation</button>`
        : run.status === "interrupted" ? `<button type="button" data-local-action="resume" data-run-id="${escapeHtml(run.runId)}">Resume simulation</button>` : "";
      return `<li><div><code>${escapeHtml(run.runId)}</code><span>${escapeHtml(run.mode)} · ${escapeHtml(run.status)}</span>${failureKind ? `<span class="failure-kind ${failureKind}">${escapeHtml(failureLabels[failureKind])}</span>` : ""}${run.failure ? `<p>${escapeHtml(run.failure)}</p>` : ""}<nav aria-label="Evidence for run ${escapeHtml(run.runId)}"><a href="/api/runs/${runId}">State</a><a href="/api/runs/${runId}/events">Events</a>${passportAvailable ? `<a href="/api/runs/${runId}/passport">Passport</a>` : ""}</nav>${action}</div><strong>${escapeHtml(run.verdict ?? run.currentStage ?? "no verdict")}</strong></li>`;
    }).join("")}</ul>`
    : `<p>No local run history is recorded yet.</p>`;
  const refs = state.refs
    ? `<div class="ref-grid"><article><span>Common base</span><strong>${escapeHtml(state.refs.base.ref)}</strong><code>${escapeHtml(state.refs.base.commit)}</code></article>${state.refs.changes.map((change) => `<article><span>Change ${escapeHtml(change.id)}</span><strong>${escapeHtml(change.ref)}</strong><code>${escapeHtml(change.commit)}</code><small>${escapeHtml(change.promptFile)}</small></article>`).join("")}</div>`
    : `<p>Frozen refs are unavailable.</p>`;
  const eventTimeline = state.events?.length
    ? `<ol class="event-timeline">${state.events.map((event) => `<li><span>${escapeHtml(String(event.sequence))}</span><div><strong>${escapeHtml(event.stage ?? event.type)}</strong><p>${escapeHtml(event.message)}</p><time>${escapeHtml(new Date(event.at).toLocaleString())}</time></div></li>`).join("")}</ol>`
    : `<p>No persisted stage events are available.</p>`;
  const detail = state.status === "checking"
    ? `<p role="status">Establishing a same-origin session and checking the loopback service…</p>`
    : state.status === "unavailable"
      ? `<div class="mode-error" role="alert"><strong>${escapeHtml(failureLabels[state.errorKind ?? "unavailable-backend"])}</strong><p>${escapeHtml(state.error ?? "Local Jointly service is unavailable.")}</p></div><p>Start the local service and open the dashboard from that service origin. No sample result has been substituted.</p>`
      : `<dl class="capabilities"><dt>Fake replay</dt><dd>${state.capabilities?.fakeReplay ? "Available" : "Unavailable"}</dd><dt>Real inference</dt><dd>${state.capabilities?.realInference ? "Available" : "Unavailable"}</dd><dt>Generated-code execution</dt><dd>${state.capabilities?.generatedCodeExecution ? "Available" : "Unavailable"}</dd><dt>Isolation</dt><dd>${escapeHtml(state.capabilities?.isolationProfile ?? "unknown")}</dd></dl>
        ${(state.capabilities?.blockers.length ?? 0) > 0 ? `<h2>Current blockers</h2><ul>${state.capabilities!.blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}</ul>` : ""}
        <h2>Deterministic preflight</h2><p class="readiness ${state.preflight?.deterministicReady ? "ready" : "blocked"}">${state.preflight?.deterministicReady ? "Ready" : "Blocked"}</p>
        ${failingChecks.length ? `<ul>${failingChecks.map((check) => `<li><strong>${escapeHtml(check.status.toUpperCase())}</strong> ${escapeHtml(check.message)}</li>`).join("")}</ul>` : `<p>All deterministic checks passed.</p>`}
        <h2>Frozen inputs</h2>${refs}<p>These exact local refs are displayed for review only. The service never fetches, switches, or silently substitutes them.</p>
        ${state.capabilities?.fakeReplay ? `<section class="simulation-controls" aria-labelledby="simulation-title"><h2 id="simulation-title">Lifecycle simulation</h2><p>This exercises authenticated checkpoints and UI states only. It performs no watsonx inference, generated-code execution, repair, or safety verification.</p><button type="button" data-local-action="start">Start simulated replay</button></section>` : ""}
        <h2>Local run history</h2>${history}
        <h2>Latest persisted events</h2><p>Events are shown in sequence order without invented percentages or countdowns.</p>${eventTimeline}
        <p>The browser session is authenticated with an HttpOnly same-origin cookie. Run controls remain disabled until the shared deterministic driver and credential-separated executor isolation are implemented.</p>`;
  return `<main class="mode-shell" tabindex="-1">${modeNavigation("connected-local")}<section class="mode-card"><p class="eyebrow">Connected local investigation</p><h1>Use the verification service on this machine.</h1>${detail}</section></main>`;
}
