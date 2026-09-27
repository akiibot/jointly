export interface LocalCapabilities {
  schemaVersion: "1";
  fakeReplay: boolean;
  realInference: boolean;
  generatedCodeExecution: boolean;
  isolationProfile: string;
  blockers: string[];
}

export interface LocalDoctorCheck {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface LocalPreflight {
  schemaVersion: "1";
  deterministicReady: boolean;
  providerReady: false;
  checks: LocalDoctorCheck[];
}

export interface LocalRunSummary {
  schemaVersion: "2";
  runId: string;
  profile: "checkout-fixture";
  mode: "fake-replay";
  status: "queued" | "running" | "awaiting-resolution" | "completed" | "failed" | "cancelled" | "interrupted";
  currentStage: string | null;
  verdict?: string;
  failure?: string;
  createdAt: string;
  updatedAt: string;
}

export type LocalFailureKind = "invalid-input" | "unavailable-backend" | "authentication-failure" |
  "budget-exhausted" | "test-setup-failed" | "collision" | "interrupted" | "unknown";

export class LocalServiceError extends Error {
  constructor(public readonly kind: LocalFailureKind, message: string, public readonly status?: number) {
    super(message);
    this.name = "LocalServiceError";
  }
}

export interface LocalRefs {
  schemaVersion: "1";
  base: { ref: string; commit: string };
  changes: Array<{ id: string; ref: string; commit: string; promptFile: string }>;
}

export interface LocalOverview {
  capabilities: LocalCapabilities;
  preflight: LocalPreflight;
  refs: LocalRefs;
  runs: LocalRunSummary[];
  events: LocalRunEvent[];
}

export interface LocalRunEvent {
  schemaVersion: "1";
  sequence: number;
  runId: string;
  at: string;
  type: string;
  stage?: string;
  message: string;
}

function object(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

export function parseLocalCapabilities(value: unknown): LocalCapabilities {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Local capabilities response is not an object.");
  const input = value as Partial<LocalCapabilities>;
  if (input.schemaVersion !== "1") throw new Error("Unsupported local capabilities schema.");
  if ([input.fakeReplay, input.realInference, input.generatedCodeExecution].some((item) => typeof item !== "boolean")) {
    throw new Error("Local capabilities response has invalid feature flags.");
  }
  if (typeof input.isolationProfile !== "string" || !Array.isArray(input.blockers) || !input.blockers.every((item) => typeof item === "string")) {
    throw new Error("Local capabilities response is incomplete.");
  }
  return input as LocalCapabilities;
}

export function parseLocalPreflight(value: unknown): LocalPreflight {
  const input = object(value, "Local preflight response is not an object.");
  if (input.schemaVersion !== "1") throw new Error("Unsupported local preflight schema.");
  if (typeof input.deterministicReady !== "boolean" || input.providerReady !== false || !Array.isArray(input.checks)) {
    throw new Error("Local preflight response is incomplete.");
  }
  const checks = input.checks.map((raw) => {
    const check = object(raw, "Local preflight check is not an object.");
    if (typeof check.id !== "string" || !["pass", "warn", "fail"].includes(String(check.status)) || typeof check.message !== "string") {
      throw new Error("Local preflight check is invalid.");
    }
    return { id: check.id, status: check.status as LocalDoctorCheck["status"], message: check.message };
  });
  return { schemaVersion: "1", deterministicReady: input.deterministicReady, providerReady: false, checks };
}

export function parseLocalRuns(value: unknown): LocalRunSummary[] {
  if (!Array.isArray(value)) throw new Error("Local run history is not an array.");
  return value.map((raw) => {
    const run = object(raw, "Local run record is not an object.");
    const statuses = ["queued", "running", "awaiting-resolution", "completed", "failed", "cancelled", "interrupted"];
    if (run.schemaVersion !== "2" || typeof run.runId !== "string" || !/^[a-f0-9-]{36}$/.test(run.runId) || run.profile !== "checkout-fixture" || run.mode !== "fake-replay"
      || !statuses.includes(String(run.status)) || !(run.currentStage === null || typeof run.currentStage === "string")
      || typeof run.createdAt !== "string" || typeof run.updatedAt !== "string" || !(run.verdict === undefined || typeof run.verdict === "string")
      || !(run.failure === undefined || typeof run.failure === "string")) {
      throw new Error("Local run record is invalid.");
    }
    return run as unknown as LocalRunSummary;
  });
}

export function parseLocalEvents(value: string, expectedRunId: string): LocalRunEvent[] {
  const events = value.split("\n\n").filter(Boolean).map((block) => {
    const data = block.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
    if (!data) throw new Error("Local event stream contains an event without data.");
    const event = object(JSON.parse(data), "Local event is not an object.");
    if (event.schemaVersion !== "1" || event.runId !== expectedRunId || !Number.isSafeInteger(event.sequence) || (event.sequence as number) <= 0
      || typeof event.at !== "string" || !Number.isFinite(Date.parse(event.at)) || typeof event.type !== "string" || typeof event.message !== "string"
      || !(event.stage === undefined || typeof event.stage === "string")) throw new Error("Local event is invalid.");
    return event as unknown as LocalRunEvent;
  });
  if (events.some((event, index) => index > 0 && event.sequence <= events[index - 1]!.sequence)) throw new Error("Local event sequence is not increasing.");
  return events;
}

function parseRef(value: unknown, promptRequired: boolean): { ref: string; commit: string; promptFile?: string; id?: string } {
  const input = object(value, "Local ref record is not an object.");
  if (typeof input.ref !== "string" || input.ref.length === 0 || typeof input.commit !== "string" || !/^[a-f0-9]{40,64}$/.test(input.commit)) {
    throw new Error("Local ref record is invalid.");
  }
  if (promptRequired && (typeof input.id !== "string" || input.id.length === 0 || typeof input.promptFile !== "string" || input.promptFile.length === 0
    || input.promptFile.startsWith("/") || input.promptFile.includes("\\") || input.promptFile.split("/").some((segment) => segment === "" || segment === "." || segment === ".."))) {
    throw new Error("Local change ref record is incomplete.");
  }
  return {
    ref: input.ref,
    commit: input.commit,
    ...(promptRequired ? { id: input.id as string, promptFile: input.promptFile as string } : {}),
  };
}

export function parseLocalRefs(value: unknown): LocalRefs {
  const input = object(value, "Local refs response is not an object.");
  if (input.schemaVersion !== "1" || !Array.isArray(input.changes) || input.changes.length !== 2) {
    throw new Error("Local refs response is incomplete.");
  }
  const base = parseRef(input.base, false) as LocalRefs["base"];
  const changes = input.changes.map((change) => parseRef(change, true) as LocalRefs["changes"][number]);
  if (new Set(changes.map((change) => change.id)).size !== 2) throw new Error("Local change IDs must be unique.");
  return { schemaVersion: "1", base, changes };
}

async function json(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", ...init, headers: { accept: "application/json", ...init?.headers } });
  if (!response.ok) {
    let detail = "";
    try {
      const body = object(await response.json(), "Local error response is not an object.");
      detail = typeof body.error === "string" ? ` ${body.error}` : "";
    } catch { /* Preserve the HTTP category even when an error body is malformed. */ }
    const kind: LocalFailureKind = response.status === 400 || response.status === 409 ? "invalid-input"
      : response.status === 401 || response.status === 403 ? "authentication-failure"
        : response.status === 429 ? "budget-exhausted"
          : response.status >= 500 ? "unavailable-backend" : "unknown";
    throw new LocalServiceError(kind, `Local Jointly service returned ${response.status} for ${path}.${detail}`, response.status);
  }
  return response.json();
}

async function eventStream(path: string): Promise<string> {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", headers: { accept: "text/event-stream" } });
  if (!response.ok) throw new LocalServiceError(response.status === 403 ? "authentication-failure" : "unavailable-backend", `Local Jointly service returned ${response.status} for ${path}.`, response.status);
  return response.text();
}

export function classifyLocalRun(run: LocalRunSummary): LocalFailureKind | undefined {
  if (run.status === "interrupted" || run.status === "cancelled") return "interrupted";
  if (run.verdict === "COLLISION_CONFIRMED" || run.verdict === "TEXTUAL_CONFLICT") return "collision";
  if (run.verdict === "INDEPENDENT_CHANGE_FAILED" || /(?:setup|collect|import|syntax|zero tests|skipped)/i.test(run.failure ?? "")) return "test-setup-failed";
  if (/(?:budget|quota|limit|429)/i.test(run.failure ?? "")) return "budget-exhausted";
  if (run.status === "failed") return "unknown";
  return undefined;
}

export async function bootstrapLocalSession(): Promise<void> {
  const value = object(await json("/api/session", { method: "POST" }), "Local session response is not an object.");
  if (value.schemaVersion !== "1" || value.authenticated !== true) throw new Error("Local session bootstrap was rejected.");
}

export async function loadLocalCapabilities(): Promise<LocalCapabilities> {
  return parseLocalCapabilities(await json("/api/capabilities"));
}

export async function loadLocalOverview(): Promise<LocalOverview> {
  await bootstrapLocalSession();
  const [capabilities, preflight, refs, runs] = await Promise.all([
    loadLocalCapabilities(),
    json("/api/preflight").then(parseLocalPreflight),
    json("/api/refs").then(parseLocalRefs),
    json("/api/runs").then(parseLocalRuns),
  ]);
  const newest = runs[0];
  const events = newest ? parseLocalEvents(await eventStream(`/api/runs/${encodeURIComponent(newest.runId)}/events`), newest.runId) : [];
  return { capabilities, preflight, refs, runs, events };
}

export async function startFakeReplay(): Promise<LocalRunSummary> {
  return parseLocalRuns([await json("/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile: "checkout-fixture", mode: "fake-replay" }),
  })])[0]!;
}

export async function cancelLocalRun(runId: string): Promise<LocalRunSummary> {
  return parseLocalRuns([await json(`/api/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" })])[0]!;
}

export async function resumeLocalRun(runId: string): Promise<LocalRunSummary> {
  return parseLocalRuns([await json(`/api/runs/${encodeURIComponent(runId)}/resume`, { method: "POST" })])[0]!;
}
