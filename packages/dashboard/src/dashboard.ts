import type { Passport } from "./passport";
import { changeOverview } from "./components/ChangeOverview";
import { intentMap } from "./components/IntentMap";
import { investigationView } from "./components/InvestigationView";
import { repairView } from "./components/RepairView";
import { passportView } from "./components/PassportView";
import { howItWorks } from "./components/HowItWorks";
import { escapeHtml } from "./components/shared";

export function renderDashboard(passport: Passport): string {
  return `<header class="masthead"><a class="brand" href="#overview" aria-label="Jointly dashboard home"><span>J</span><strong>Jointly</strong></a>
    <nav aria-label="Dashboard sections"><a href="#how-it-works">How it works</a><a href="#overview">Overview</a><a href="#intent">Intent</a><a href="#investigation">Investigation</a><a href="#repair">Repair</a><a href="#passport">Passport</a></nav>
    <label class="upload"><input id="passport-file" type="file" accept="application/json,.json"><span>Open passport</span></label></header>
    <main><section class="hero"><div><p class="eyebrow">Intent-aware pre-merge verification</p><h1>See the collision<br><em>before</em> it ships.</h1><p class="lede">${escapeHtml(passport.summary)}</p></div><aside><span>Run</span><code>${escapeHtml(passport.runId)}</code><span>Two-change MVP</span></aside></section>
    ${howItWorks()}${changeOverview(passport)}${intentMap(passport)}${investigationView(passport)}${repairView(passport)}${passportView(passport)}</main>`;
}

export function renderError(message: string): string {
  return `<main class="error-state"><div class="error-mark">!</div><p class="eyebrow">Passport unavailable</p><h1>We could not open this investigation.</h1><p>${escapeHtml(message)}</p><label class="upload prominent"><input id="passport-file" type="file" accept="application/json,.json"><span>Choose passport.json</span></label><small>No analysis happens in this dashboard. It only presents an existing Jointly passport.</small></main>`;
}
