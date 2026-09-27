import "./style.css";
import { renderDashboard, renderError, renderImportMode, renderLocalMode } from "./dashboard";
import { cancelLocalRun, loadLocalOverview, LocalServiceError, resumeLocalRun, startFakeReplay } from "./local-client";
import type { DashboardContext } from "./modes";
import { loadPassport, passportFromFile } from "./passport";

const app = document.querySelector<HTMLDivElement>("#app")!;

function bindFilePicker(): void {
  document.querySelector<HTMLInputElement>("#passport-file")?.addEventListener("change", async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try { showDashboard(await passportFromFile(file), { mode: "imported", source: file.name }); }
    catch (error) { showImport(error instanceof Error ? error.message : "Unknown passport error."); }
  });
}

function showDashboard(passport: Awaited<ReturnType<typeof loadPassport>>, context: DashboardContext): void {
  app.innerHTML = renderDashboard(passport, context);
  bindFilePicker();
  bindPassportDownloads(passport);
  if (location.hash) {
    requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
  }
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindPassportDownloads(passport: Awaited<ReturnType<typeof loadPassport>>): void {
  document.querySelectorAll<HTMLButtonElement>("[data-passport-download]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.passportDownload === "passport") downloadText("passport.json", `${JSON.stringify(passport, null, 2)}\n`, "application/json");
      if (button.dataset.passportDownload === "repair" && passport.repair) downloadText("repair.patch", passport.repair, "text/x-diff");
      const source = passport.collisionEvidence?.beforeRepair?.generatedTestSource;
      if (button.dataset.passportDownload === "generated-test" && source) downloadText("generated-interaction.test.ts", source, "text/plain");
    });
  });
}

function showImport(message?: string): void { app.innerHTML = renderImportMode(message); bindFilePicker(); }

function announceUpdatedView(): void {
  requestAnimationFrame(() => document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true }));
}

async function refreshLocalView(): Promise<void> {
  try {
    app.innerHTML = renderLocalMode({ status: "ready", ...(await loadLocalOverview()) });
    bindLocalControls();
  } catch (error) {
    app.innerHTML = renderLocalMode({
      status: "unavailable",
      error: error instanceof Error ? error.message : "Local Jointly service is unavailable.",
      ...(error instanceof LocalServiceError ? { errorKind: error.kind } : {}),
    });
  }
  announceUpdatedView();
}

function bindLocalControls(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-local-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.localAction;
      const runId = button.dataset.runId;
      button.disabled = true;
      button.textContent = action === "start" ? "Starting simulation…" : action === "cancel" ? "Cancelling…" : "Resuming…";
      try {
        if (action === "start") await startFakeReplay();
        else if (action === "cancel" && runId) await cancelLocalRun(runId);
        else if (action === "resume" && runId) await resumeLocalRun(runId);
      } catch (error) {
        app.innerHTML = renderLocalMode({
          status: "unavailable",
          error: error instanceof Error ? error.message : "Local lifecycle action failed.",
          ...(error instanceof LocalServiceError ? { errorKind: error.kind } : {}),
        });
        announceUpdatedView();
        return;
      }
      await refreshLocalView();
    });
  });
}

function showError(message: string): void {
  app.innerHTML = renderError(message);
  bindFilePicker();
}

const parameters = new URLSearchParams(location.search);
const requested = parameters.get("passport");
const mode = parameters.get("mode") ?? (requested ? "import" : "sample");

if (mode === "import") {
  if (requested) {
    loadPassport(requested)
      .then((passport) => showDashboard(passport, { mode: "imported", source: requested }))
      .catch((error) => showImport(error instanceof Error ? error.message : "Unknown passport error."));
  } else showImport();
} else if (mode === "local") {
  app.innerHTML = renderLocalMode({ status: "checking" });
  loadLocalOverview()
    .then((overview) => { app.innerHTML = renderLocalMode({ status: "ready", ...overview }); bindLocalControls(); announceUpdatedView(); })
    .catch((error) => {
      app.innerHTML = renderLocalMode({
        status: "unavailable",
        error: error instanceof Error ? error.message : "Local Jointly service is unavailable.",
        ...(error instanceof LocalServiceError ? { errorKind: error.kind } : {}),
      });
      announceUpdatedView();
    });
} else if (mode === "sample") {
  loadPassport("./passport.json")
    .then((passport) => showDashboard(passport, { mode: "sample", source: "bundled historical passport.json" }))
    .catch((error) => showError(error instanceof Error ? error.message : "Unknown passport error."));
} else showError(`Unknown dashboard mode: ${mode}.`);
