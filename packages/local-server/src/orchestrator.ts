import { randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, readFile, readdir, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { PASSPORT_VERDICTS, requirementResolutionSchema, sha256, writeJson } from "@jointly/core";
import { z } from "zod";

export const LOCAL_STAGES = [
  "setup", "baseline", "intent-a", "intent-b", "hypotheses",
  "generated-test-proposal", "diagnosis", "requirement-resolution",
  "repair-proposal", "review", "verification", "stability", "passport",
] as const;
export type LocalStage = (typeof LOCAL_STAGES)[number];

const artifactRecordSchema = z.object({
  schemaVersion: z.literal("1"), stage: z.enum(LOCAL_STAGES),
  mode: z.literal("fake-replay"), simulated: z.literal(true),
  result: z.record(z.string(), z.unknown()),
}).strict();

const stageResultSchema = z.object({
  schemaVersion: z.literal("1"), stage: z.enum(LOCAL_STAGES),
  outcome: z.enum(["continue", "awaiting-resolution", "stop"]),
  artifactId: z.enum(LOCAL_STAGES), artifact: z.string().min(1),
  artifactDigest: z.string().regex(/^[a-f0-9]{64}$/), attemptId: z.string().min(1),
  modelRequestId: z.string().min(1).optional(), verdict: z.enum(PASSPORT_VERDICTS).optional(),
  message: z.string().min(1),
}).strict().superRefine((value, context) => {
  if (value.stage !== value.artifactId) context.addIssue({ code: "custom", message: "artifactId must equal stage" });
  if (value.outcome === "stop" && !value.verdict) context.addIssue({ code: "custom", message: "stop requires a verdict" });
  if (value.outcome === "awaiting-resolution" && value.stage !== "requirement-resolution") {
    context.addIssue({ code: "custom", message: "only requirement-resolution may pause" });
  }
});
export type StageResult = z.infer<typeof stageResultSchema>;

const stateSchema = z.object({
  schemaVersion: z.literal("2"), runId: z.string().uuid(),
  inputDigest: z.string().regex(/^[a-f0-9]{64}$/),
  profile: z.literal("checkout-fixture"), mode: z.literal("fake-replay"),
  status: z.enum(["queued", "running", "awaiting-resolution", "completed", "failed", "cancelled", "interrupted"]),
  currentStage: z.enum(LOCAL_STAGES).nullable(), completedStages: z.array(z.enum(LOCAL_STAGES)),
  attempts: z.partialRecord(z.enum(LOCAL_STAGES), z.number().int().nonnegative()),
  stageResults: z.partialRecord(z.enum(LOCAL_STAGES), stageResultSchema),
  resolutionArtifact: z.string().optional(), verdict: z.enum(PASSPORT_VERDICTS).optional(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), failure: z.string().optional(),
}).strict();
export type LocalRunState = z.infer<typeof stateSchema>;

export interface LocalRunEvent {
  schemaVersion: "1"; sequence: number; runId: string; at: string;
  type: "run-created" | "stage-started" | "stage-retry" | "stage-completed" |
    "resolution-required" | "resolution-recorded" | "run-resumed" | "run-completed" |
    "run-failed" | "run-cancelled" | "run-interrupted";
  stage?: LocalStage; message: string;
}

export function redactOperationalMessage(value: string): string {
  return value
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+\/-]+=*/gi, "$1 [REDACTED]")
    .replace(/\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*)\s*[=:]\s*([^\s,;]+)/gi, "$1=[REDACTED]")
    .slice(0, 2_000);
}

export interface StageContext {
  runId: string; runRoot: string; attempt: number; attemptId: string;
  inputDigest: string; resolutionArtifact?: string; signal: AbortSignal;
}
export interface StageDriver { execute(stage: LocalStage, context: StageContext): Promise<unknown>; }

export class FakeReplayDriver implements StageDriver {
  async execute(stage: LocalStage, context: StageContext): Promise<StageResult> {
    if (context.signal.aborted) throw context.signal.reason;
    const result = stage === "passport"
      ? { verdict: "INSUFFICIENT_EVIDENCE", verificationGates: { passed: false, failures: ["fake replay is not verification"] } }
      : { simulatedStage: stage };
    const artifact = `artifacts/${stage}.json`;
    const record = { schemaVersion: "1", stage, mode: "fake-replay", simulated: true, result } as const;
    await writeJson(context.runRoot, artifact, record);
    return {
      schemaVersion: "1", stage, outcome: "continue", artifactId: stage, artifact,
      artifactDigest: sha256(JSON.stringify(record)), attemptId: context.attemptId,
      message: `Validated simulated ${stage} artifact.`,
    };
  }
}

export class LocalRunCoordinator {
  private readonly states = new Map<string, LocalRunState>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly completions = new Map<string, Promise<LocalRunState>>();
  private readonly sequences = new Map<string, number>();

  constructor(private readonly repositoryRoot: string, private readonly driver: StageDriver, private readonly maxStageAttempts = 2) {}

  private runRoot(runId: string) { return path.join(this.repositoryRoot, "runs", "local-server", runId); }

  private async persist(state: LocalRunState) {
    const root = this.runRoot(state.runId);
    await mkdir(root, { recursive: true });
    const destination = path.join(root, "state.json");
    const temporary = path.join(root, `.state.${process.pid}.${randomUUID()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
  }

  private async event(runId: string, type: LocalRunEvent["type"], message: string, stage?: LocalStage) {
    const sequence = (this.sequences.get(runId) ?? 0) + 1;
    this.sequences.set(runId, sequence);
    const event: LocalRunEvent = { schemaVersion: "1", sequence, runId, at: new Date().toISOString(), type, ...(stage ? { stage } : {}), message: redactOperationalMessage(message) };
    await appendFile(path.join(this.runRoot(runId), "events.ndjson"), `${JSON.stringify(event)}\n`, "utf8");
  }

  private async validateStageResult(stage: LocalStage, raw: unknown, runRoot: string): Promise<StageResult> {
    const parsed = stageResultSchema.safeParse(raw);
    if (!parsed.success) throw new Error(`invalid ${stage} result: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    const result = parsed.data;
    if (result.stage !== stage || result.artifact !== `artifacts/${stage}.json`) throw new Error(`invalid ${stage} artifact binding`);
    const artifactPath = path.join(runRoot, result.artifact);
    const [rootRealPath, artifactRealPath, artifactStat] = await Promise.all([realpath(runRoot), realpath(artifactPath), lstat(artifactPath)]);
    if (artifactStat.isSymbolicLink() || path.relative(rootRealPath, artifactRealPath).startsWith("..")) throw new Error(`invalid ${stage} artifact path`);
    const record = artifactRecordSchema.parse(JSON.parse(await readFile(artifactRealPath, "utf8")));
    if (record.stage !== stage || sha256(JSON.stringify(record)) !== result.artifactDigest) throw new Error(`stale or mismatched ${stage} artifact`);
    if (stage === "passport") {
      const passport = z.object({
        verdict: z.enum(PASSPORT_VERDICTS),
        verificationGates: z.object({ passed: z.boolean(), failures: z.array(z.string()) }).strict(),
      }).strict().safeParse(record.result);
      if (!passport.success) throw new Error("fake passport artifact lacks structured gates");
      if (passport.data.verdict === "SAFE_TO_MERGE" && !passport.data.verificationGates.passed) {
        throw new Error("model/passport claim cannot bypass failed verification gates");
      }
    }
    return result;
  }

  async recover(): Promise<void> {
    const root = path.join(this.repositoryRoot, "runs", "local-server");
    let entries: string[] = [];
    try { entries = await readdir(root); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    for (const runId of entries) {
      try {
        const parsed = stateSchema.parse(JSON.parse(await readFile(path.join(root, runId, "state.json"), "utf8")));
        const priorEvents = await this.readEventsFile(runId);
        this.sequences.set(runId, priorEvents.at(-1)?.sequence ?? 0);
        if (parsed.status === "queued" || parsed.status === "running") {
          parsed.status = "interrupted";
          parsed.failure = "Local server restarted before the run reached a terminal state.";
          parsed.updatedAt = new Date().toISOString();
          await this.persist(parsed);
          await this.event(runId, "run-interrupted", parsed.failure);
        }
        this.states.set(runId, parsed);
      } catch { /* Invalid directories are never imported as runs. */ }
    }
  }

  async create(): Promise<LocalRunState> {
    if ([...this.states.values()].some((state) => ["queued", "running", "awaiting-resolution"].includes(state.status))) throw new Error("one local run is already active");
    const now = new Date().toISOString();
    const state: LocalRunState = {
      schemaVersion: "2", runId: randomUUID(),
      inputDigest: sha256(JSON.stringify({ profile: "checkout-fixture", mode: "fake-replay", schemaVersion: "1" })),
      profile: "checkout-fixture", mode: "fake-replay", status: "queued", currentStage: null,
      completedStages: [], attempts: {}, stageResults: {}, createdAt: now, updatedAt: now,
    };
    this.states.set(state.runId, state);
    await this.persist(state);
    await this.event(state.runId, "run-created", "Fake replay queued; no live provider or generated code execution is involved.");
    this.startExecution(state.runId);
    return structuredClone(state);
  }

  private startExecution(runId: string) { this.completions.set(runId, this.execute(runId)); }

  private async execute(runId: string): Promise<LocalRunState> {
    const state = this.states.get(runId)!;
    const controller = new AbortController();
    this.controllers.set(runId, controller);
    state.status = "running";
    delete state.failure;
    try {
      for (const stage of LOCAL_STAGES) {
        if (state.completedStages.includes(stage)) continue;
        if (controller.signal.aborted) throw controller.signal.reason;
        state.currentStage = stage;
        let completed = false;
        while (!completed) {
          const attempt = (state.attempts[stage] ?? 0) + 1;
          state.attempts[stage] = attempt;
          state.updatedAt = new Date().toISOString();
          await this.persist(state);
          await this.event(runId, "stage-started", `Started ${stage} attempt ${attempt}.`, stage);
          if (controller.signal.aborted) throw controller.signal.reason;
          try {
            const raw = await this.driver.execute(stage, {
              runId, runRoot: this.runRoot(runId), attempt, attemptId: `${stage}-${attempt}`,
              inputDigest: state.inputDigest, resolutionArtifact: state.resolutionArtifact, signal: controller.signal,
            });
            const result = await this.validateStageResult(stage, raw, this.runRoot(runId));
            if (result.outcome === "awaiting-resolution") {
              state.status = "awaiting-resolution";
              state.currentStage = stage;
              state.updatedAt = new Date().toISOString();
              await this.persist(state);
              await this.event(runId, "resolution-required", result.message, stage);
              return structuredClone(state);
            }
            state.stageResults[stage] = result;
            state.completedStages.push(stage);
            state.verdict = result.verdict ?? state.verdict;
            await this.event(runId, "stage-completed", result.message, stage);
            completed = true;
            if (result.outcome === "stop") {
              state.status = "completed";
              state.currentStage = null;
              state.updatedAt = new Date().toISOString();
              await this.persist(state);
              await this.event(runId, "run-completed", `Investigation stopped honestly with ${result.verdict}.`);
              return structuredClone(state);
            }
          } catch (error) {
            if (controller.signal.aborted) throw error;
            if (attempt >= this.maxStageAttempts) throw error;
            await this.event(runId, "stage-retry", `${stage} artifact rejected; one bounded retry remains.`, stage);
          }
        }
      }
      state.status = "completed";
      state.currentStage = null;
      state.verdict ??= "INSUFFICIENT_EVIDENCE";
      state.updatedAt = new Date().toISOString();
      await this.persist(state);
      await this.event(runId, "run-completed", `Fake replay completed with ${state.verdict}.`);
    } catch (error) {
      state.status = controller.signal.aborted ? "cancelled" : "failed";
      state.currentStage = null;
      state.failure = redactOperationalMessage(controller.signal.aborted ? "Run cancelled by the local operator." : error instanceof Error ? error.message : String(error));
      state.updatedAt = new Date().toISOString();
      await this.persist(state);
      await this.event(runId, controller.signal.aborted ? "run-cancelled" : "run-failed", state.failure);
    } finally { this.controllers.delete(runId); }
    return structuredClone(state);
  }

  private async revalidateCompletedArtifacts(state: LocalRunState): Promise<void> {
    for (const stage of state.completedStages) {
      const result = state.stageResults[stage];
      if (!result) throw new Error(`completed stage lacks result: ${stage}`);
      await this.validateStageResult(stage, result, this.runRoot(state.runId));
    }
  }

  async recordResolution(runId: string, raw: unknown): Promise<LocalRunState> {
    const state = this.states.get(runId);
    if (!state) throw new Error("run not found");
    if (state.status !== "awaiting-resolution") throw new Error("run is not awaiting a requirement resolution");
    const resolution = requirementResolutionSchema.parse(raw);
    if (resolution.decision === "unresolved" || !resolution.authority) throw new Error("resolution requires recorded authority");
    state.resolutionArtifact = await writeJson(this.runRoot(runId), "artifacts/operator-resolution.json", resolution);
    state.updatedAt = new Date().toISOString();
    await this.persist(state);
    await this.event(runId, "resolution-recorded", `Authorized resolution ${resolution.id} recorded.`, "requirement-resolution");
    return structuredClone(state);
  }

  async resume(runId: string): Promise<LocalRunState> {
    const state = this.states.get(runId);
    if (!state) throw new Error("run not found");
    if (state.status !== "interrupted" && state.status !== "awaiting-resolution") throw new Error("only interrupted or awaiting-resolution runs may resume");
    if (state.status === "awaiting-resolution" && !state.resolutionArtifact) throw new Error("authorized resolution is required before resume");
    await this.revalidateCompletedArtifacts(state);
    state.status = "queued";
    state.updatedAt = new Date().toISOString();
    await this.persist(state);
    await this.event(runId, "run-resumed", "Run inputs and completed artifacts revalidated; resuming incomplete work.");
    this.startExecution(runId);
    return structuredClone(state);
  }

  get(runId: string) { const state = this.states.get(runId); return state ? structuredClone(state) : undefined; }
  list() { return [...this.states.values()].map((state) => structuredClone(state)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async wait(runId: string) { const completion = this.completions.get(runId); if (completion) return completion; const state = this.get(runId); if (!state) throw new Error("run not found"); return state; }

  async cancel(runId: string): Promise<LocalRunState> {
    const state = this.states.get(runId);
    if (!state) throw new Error("run not found");
    if (state.status === "cancelled") return structuredClone(state);
    if (state.status === "awaiting-resolution") {
      state.status = "cancelled";
      state.currentStage = null;
      state.failure = "Run cancelled by the local operator.";
      state.updatedAt = new Date().toISOString();
      await this.persist(state);
      await this.event(runId, "run-cancelled", state.failure);
      return structuredClone(state);
    }
    if (state.status !== "queued" && state.status !== "running") throw new Error("run is already terminal");
    this.controllers.get(runId)?.abort(new Error("cancelled"));
    return structuredClone(state);
  }

  private async readEventsFile(runId: string): Promise<LocalRunEvent[]> {
    try { return (await readFile(path.join(this.runRoot(runId), "events.ndjson"), "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as LocalRunEvent); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  async events(runId: string, afterSequence = 0) { if (!this.states.has(runId)) throw new Error("run not found"); return (await this.readEventsFile(runId)).filter((event) => event.sequence > afterSequence); }

  async readArtifact(runId: string, artifactId: LocalStage) {
    const state = this.states.get(runId);
    if (!state) throw new Error("run not found");
    const result = state.stageResults[artifactId];
    if (!result) throw new Error("artifact is not registered");
    await this.validateStageResult(artifactId, result, this.runRoot(runId));
    return { path: result.artifact, content: await readFile(path.join(this.runRoot(runId), result.artifact)) };
  }
}
