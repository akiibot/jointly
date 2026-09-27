import { escapeHtml } from "./components/shared";

export type DashboardMode = "sample" | "imported" | "connected-local";

export interface DashboardContext {
  mode: DashboardMode;
  source: string;
}

const modeLabels: Record<DashboardMode, string> = {
  sample: "Sample demonstration",
  imported: "Imported passport",
  "connected-local": "Connected local investigation",
};

const modeDescriptions: Record<DashboardMode, string> = {
  sample: "Historical bundled evidence for product demonstration. Nothing is running now.",
  imported: "Evidence loaded from a selected file or explicit URL. The viewer performs no analysis.",
  "connected-local": "Status from the loopback Jointly service. It never falls back to sample results.",
};

export function modeNavigation(active: DashboardMode): string {
  const links: Array<{ mode: DashboardMode; href: string; label: string }> = [
    { mode: "sample", href: "?mode=sample", label: "Sample" },
    { mode: "imported", href: "?mode=import", label: "Import" },
    { mode: "connected-local", href: "?mode=local", label: "Local" },
  ];
  return `<nav class="mode-nav" aria-label="Dashboard modes">${links.map((link) =>
    `<a href="${link.href}"${link.mode === active ? ' aria-current="page"' : ""}>${link.label}</a>`).join("")}</nav>`;
}

export function modeBanner(context: DashboardContext): string {
  return `<aside class="mode-banner ${context.mode}" aria-label="Current dashboard mode">
    <div><strong>${escapeHtml(modeLabels[context.mode])}</strong><span>${escapeHtml(modeDescriptions[context.mode])}</span></div>
    <code>${escapeHtml(context.source)}</code>
  </aside>`;
}
