import "./style.css";
import { renderDashboard, renderError } from "./dashboard";
import { loadPassport, passportFromFile } from "./passport";

const app = document.querySelector<HTMLDivElement>("#app")!;

function bindFilePicker(): void {
  document.querySelector<HTMLInputElement>("#passport-file")?.addEventListener("change", async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try { showDashboard(await passportFromFile(file)); }
    catch (error) { showError(error instanceof Error ? error.message : "Unknown passport error."); }
  });
}

function showDashboard(passport: Awaited<ReturnType<typeof loadPassport>>): void {
  app.innerHTML = renderDashboard(passport);
  bindFilePicker();
}

function showError(message: string): void {
  app.innerHTML = renderError(message);
  bindFilePicker();
}

const requested = new URLSearchParams(location.search).get("passport") ?? "./passport.json";
loadPassport(requested).then(showDashboard).catch((error) => showError(error instanceof Error ? error.message : "Unknown passport error."));
