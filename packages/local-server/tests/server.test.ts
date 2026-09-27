import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sha256, writeJson } from "@jointly/core";
import {
  buildLocalServer,
  FakeReplayDriver,
  LocalRunCoordinator,
  type LocalStage,
  type StageContext,
  type StageDriver,
  type StageResult,
} from "../src/index.js";

class BlockingDriver implements StageDriver {
  release!: () => void;
  entered = new Promise<void>((resolve) => { this.release = resolve; });
  async execute(_stage: LocalStage, { signal }: { signal: AbortSignal }) {
    if (signal.aborted) throw signal.reason;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 5_000);
      this.release = () => { clearTimeout(timer); resolve(); };
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    });
  }
}

class ResolutionDriver extends FakeReplayDriver {
  override async execute(stage: LocalStage, context: StageContext): Promise<StageResult> {
    const result = await super.execute(stage, context);
    if (stage === "requirement-resolution" && !context.resolutionArtifact) {
      return { ...result, outcome: "awaiting-resolution", message: "Operator authority is required." };
    }
    return result;
  }
}

const authorizedResolution = {
  schemaVersion: "1",
  id: "R-1",
  conflictingRequirementIds: ["A-1", "B-1"],
  originalStatements: [
    { requirementId: "A-1", statement: "A" },
    { requirementId: "B-1", statement: "B" },
  ],
  decision: "accepted-replacement",
  proposedReplacement: "Combined behavior",
  rationale: "The operator selected the combined contract.",
  authority: { kind: "operator", source: "local decision 1" },
  affectedTests: ["generated-tests/interaction.test.ts"],
  createdAt: "2026-09-27T00:00:00.000Z",
};

describe("local server", () => {
  it("runs a labeled fake lifecycle and persists ordered events", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const { app, coordinator, sessionToken } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token" });
    const response = await app.inject({
      method: "POST",
      url: "/api/runs",
      headers: { host: "127.0.0.1", "x-jointly-session": sessionToken },
      payload: { profile: "checkout-fixture", mode: "fake-replay" },
    });
    expect(response.statusCode).toBe(202);
    const runId = response.json().runId as string;
    const state = await coordinator.wait(runId);
    expect(state).toMatchObject({ status: "completed", mode: "fake-replay" });
    expect(state).toMatchObject({ schemaVersion: "2", verdict: "INSUFFICIENT_EVIDENCE" });
    expect(state.completedStages).toHaveLength(13);
    const events = await coordinator.events(runId);
    expect(events[0]).toMatchObject({ sequence: 1, type: "run-created" });
    expect(events.at(-1)).toMatchObject({ type: "run-completed" });
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index + 1));
    const replay = await app.inject({
      method: "GET",
      url: `/api/runs/${runId}/events`,
      headers: { host: "127.0.0.1", "x-jointly-session": sessionToken, "last-event-id": String(events[1]!.sequence) },
    });
    expect(replay.headers["content-type"]).toContain("text/event-stream");
    expect(replay.body).not.toContain(`id: ${events[0]!.sequence}\n`);
    expect(replay.body).toContain(`id: ${events[2]!.sequence}\n`);
    expect((await app.inject({
      method: "GET",
      url: `/api/runs/${runId}/passport`,
      headers: { host: "127.0.0.1", "x-jointly-session": sessionToken },
    })).json()).toMatchObject({ simulated: true, result: { verdict: "INSUFFICIENT_EVIDENCE" } });
    expect((await app.inject({
      method: "GET",
      url: `/api/runs/${runId}/artifacts/not-a-stage`,
      headers: { host: "127.0.0.1", "x-jointly-session": sessionToken },
    })).statusCode).toBe(404);
    await app.close();
  });

  it("rejects missing session tokens, cross-site origins, and all real-run shapes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const { app } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token" });
    expect((await app.inject({ method: "POST", url: "/api/runs", payload: { profile: "checkout-fixture", mode: "fake-replay" } })).statusCode).toBe(403);
    expect((await app.inject({
      method: "POST",
      url: "/api/runs",
      headers: { host: "127.0.0.1", origin: "https://evil.example", "x-jointly-session": "test-token" },
      payload: { profile: "checkout-fixture", mode: "fake-replay" },
    })).statusCode).toBe(403);
    expect((await app.inject({
      method: "POST",
      url: "/api/runs",
      headers: { host: "127.0.0.1", "x-jointly-session": "test-token" },
      payload: { profile: "checkout-fixture", mode: "watsonx" },
    })).statusCode).toBe(400);
    const capabilities = (await app.inject({ method: "GET", url: "/api/capabilities", headers: { host: "localhost" } })).json();
    expect(capabilities).toMatchObject({ realInference: false, generatedCodeExecution: false, isolationProfile: "unavailable" });
    expect((await app.inject({ method: "GET", url: "/api/health", headers: { host: "jointly.example" } })).statusCode).toBe(403);
    await app.close();
  });

  it("bootstraps an HttpOnly same-origin browser session for read-only local APIs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const { app } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token" });
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/session",
      headers: { host: "127.0.0.1:3210", origin: "http://127.0.0.1:3210", "sec-fetch-site": "same-origin" },
    });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json()).toEqual({ schemaVersion: "1", authenticated: true });
    expect(bootstrap.headers["cache-control"]).toBe("no-store");
    const cookie = String(bootstrap.headers["set-cookie"]);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("undefined");
    expect((await app.inject({ method: "GET", url: "/api/runs", headers: { host: "127.0.0.1:3210", cookie } })).statusCode).toBe(200);
    expect((await app.inject({
      method: "POST", url: "/api/session",
      headers: { host: "127.0.0.1:3210", origin: "http://localhost:9999", "sec-fetch-site": "cross-site" },
    })).statusCode).toBe(403);
    await app.close();
  });

  it("returns authenticated exact refs without fetching or switching", async () => {
    const repositoryRoot = path.resolve("..", "..");
    const { app } = await buildLocalServer({ repositoryRoot, sessionToken: "test-token" });
    const response = await app.inject({
      method: "GET", url: "/api/refs",
      headers: { host: "127.0.0.1", "x-jointly-session": "test-token" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      schemaVersion: "1",
      base: { ref: "jointly-demo-base", commit: expect.stringMatching(/^[a-f0-9]{40}$/) },
      changes: [
        { id: "coupon", ref: "origin/agent/coupon", commit: expect.stringMatching(/^[a-f0-9]{40}$/), promptFile: "scenarios/checkout/coupon-prompt.md" },
        { id: "payment-retry", ref: "origin/agent/payment-retry", commit: expect.stringMatching(/^[a-f0-9]{40}$/), promptFile: "scenarios/checkout/payment-retry-prompt.md" },
      ],
    });
    await app.close();
  });

  it("serves only confined built dashboard assets from the loopback origin", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const dashboardRoot = path.join(root, "dashboard");
    await mkdir(path.join(dashboardRoot, "assets"), { recursive: true });
    await writeFile(path.join(dashboardRoot, "index.html"), "<!doctype html><title>Jointly</title>");
    await writeFile(path.join(dashboardRoot, "passport.json"), "{}\n");
    await writeFile(path.join(dashboardRoot, "assets", "app.js"), "export {};\n");
    const { app } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token", dashboardRoot });
    const headers = { host: "127.0.0.1:4317" };
    const index = await app.inject({ method: "GET", url: "/?mode=local", headers });
    expect(index.statusCode).toBe(200);
    expect(index.headers["content-type"]).toContain("text/html");
    expect(index.body).toContain("Jointly");
    expect((await app.inject({ method: "GET", url: "/assets/app.js", headers })).headers["content-type"]).toContain("text/javascript");
    expect((await app.inject({ method: "GET", url: "/assets/%2e%2e/%2e%2e/package.json", headers })).statusCode).toBe(404);
    await app.close();
  });

  it("allows one active run and cancellation prevents late completion", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const driver = new BlockingDriver();
    const { app, coordinator } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token", driver });
    const headers = { host: "127.0.0.1", "x-jointly-session": "test-token" };
    const first = await app.inject({ method: "POST", url: "/api/runs", headers, payload: { profile: "checkout-fixture", mode: "fake-replay" } });
    const runId = first.json().runId as string;
    expect((await app.inject({ method: "POST", url: "/api/runs", headers, payload: { profile: "checkout-fixture", mode: "fake-replay" } })).statusCode).toBe(409);
    expect((await app.inject({ method: "POST", url: `/api/runs/${runId}/cancel`, headers })).statusCode).toBe(200);
    expect((await coordinator.wait(runId)).status).toBe("cancelled");
    driver.release();
    expect(coordinator.get(runId)?.status).toBe("cancelled");
    await app.close();
  });

  it("recovers an active persisted run as interrupted rather than successful", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const runId = "00000000-0000-4000-8000-000000000001";
    const runRoot = path.join(root, "runs", "local-server", runId);
    await mkdir(runRoot, { recursive: true });
    await writeFile(path.join(runRoot, "state.json"), `${JSON.stringify({
      schemaVersion: "2",
      runId,
      inputDigest: sha256("inputs"),
      profile: "checkout-fixture",
      mode: "fake-replay",
      status: "running",
      currentStage: "repair-proposal",
      completedStages: [],
      attempts: {},
      stageResults: {},
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:01:00.000Z",
    })}\n`);
    const coordinator = new LocalRunCoordinator(root, { execute: async () => {} });
    await coordinator.recover();
    expect(coordinator.get(runId)?.status).toBe("interrupted");
    expect(await readFile(path.join(runRoot, "events.ndjson"), "utf8")).toContain("run-interrupted");
  });

  it("bounds malformed-stage retries and never marks rejected artifacts complete", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const coordinator = new LocalRunCoordinator(root, { execute: async () => ({ claimed: "success" }) });
    const created = await coordinator.create();
    const state = await coordinator.wait(created.runId);
    expect(state).toMatchObject({ status: "failed", currentStage: null, attempts: { setup: 2 } });
    expect(state.completedStages).toEqual([]);
    expect((await coordinator.events(created.runId)).filter((event) => event.type === "stage-retry")).toHaveLength(1);
  });

  it("pauses for an authorized decision, revalidates checkpoints, and resumes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const { app, coordinator } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token", driver: new ResolutionDriver() });
    const headers = { host: "127.0.0.1", "x-jointly-session": "test-token" };
    const created = await app.inject({ method: "POST", url: "/api/runs", headers, payload: { profile: "checkout-fixture", mode: "fake-replay" } });
    const runId = created.json().runId as string;
    expect((await coordinator.wait(runId)).status).toBe("awaiting-resolution");
    expect((await app.inject({ method: "POST", url: `/api/runs/${runId}/resume`, headers })).statusCode).toBe(409);
    expect((await app.inject({ method: "POST", url: `/api/runs/${runId}/resolutions`, headers, payload: { ...authorizedResolution, decision: "unresolved", authority: undefined } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: `/api/runs/${runId}/resolutions`, headers, payload: authorizedResolution })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: `/api/runs/${runId}/resume`, headers })).statusCode).toBe(202);
    expect((await coordinator.wait(runId)).status).toBe("completed");
    expect(coordinator.get(runId)?.attempts["requirement-resolution"]).toBe(2);
    await app.close();
  });

  it("rejects resume when a completed checkpoint artifact changed", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const { app, coordinator } = await buildLocalServer({ repositoryRoot: root, sessionToken: "test-token", driver: new ResolutionDriver() });
    const headers = { host: "127.0.0.1", "x-jointly-session": "test-token" };
    const created = await app.inject({ method: "POST", url: "/api/runs", headers, payload: { profile: "checkout-fixture", mode: "fake-replay" } });
    const runId = created.json().runId as string;
    await coordinator.wait(runId);
    await app.inject({ method: "POST", url: `/api/runs/${runId}/resolutions`, headers, payload: authorizedResolution });
    await writeFile(path.join(root, "runs", "local-server", runId, "artifacts", "setup.json"), "{}\n");
    const resume = await app.inject({ method: "POST", url: `/api/runs/${runId}/resume`, headers });
    expect(resume.statusCode).toBe(409);
    expect(resume.json().error).toMatch(/invalid|stale|mismatched/i);
    await app.close();
  });

  it("stops early with an honest non-safe verdict", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const fake = new FakeReplayDriver();
    const coordinator = new LocalRunCoordinator(root, {
      execute: async (stage, context) => {
        const result = await fake.execute(stage, context);
        return stage === "baseline"
          ? { ...result, outcome: "stop", verdict: "INDEPENDENT_CHANGE_FAILED", message: "Independent baseline failed." }
          : result;
      },
    });
    const created = await coordinator.create();
    const state = await coordinator.wait(created.runId);
    expect(state).toMatchObject({ status: "completed", verdict: "INDEPENDENT_CHANGE_FAILED" });
    expect(state.completedStages).toEqual(["setup", "baseline"]);
  });

  it("rejects a SAFE_TO_MERGE model claim when structured gates failed", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-server-"));
    const fake = new FakeReplayDriver();
    const coordinator = new LocalRunCoordinator(root, {
      execute: async (stage, context) => {
        const result = await fake.execute(stage, context);
        if (stage !== "passport") return result;
        const record = {
          schemaVersion: "1",
          stage,
          mode: "fake-replay",
          simulated: true,
          result: { verdict: "SAFE_TO_MERGE", verificationGates: { passed: false, failures: ["missing evidence"] } },
        } as const;
        await writeJson(context.runRoot, result.artifact, record);
        return { ...result, artifactDigest: sha256(JSON.stringify(record)) };
      },
    });
    const created = await coordinator.create();
    const state = await coordinator.wait(created.runId);
    expect(state.status).toBe("failed");
    expect(state.failure).toContain("cannot bypass failed verification gates");
    expect(state.attempts.passport).toBe(2);
  });

  it("redacts secrets from persisted failures and replayed events", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-local-redaction-"));
    const coordinator = new LocalRunCoordinator(root, {
      execute: async () => { throw new Error("WATSONX_API_KEY=canary-secret Bearer abc.def.ghi"); },
    }, 1);
    const created = await coordinator.create();
    const state = await coordinator.wait(created.runId);
    expect(state.failure).toContain("WATSONX_API_KEY=[REDACTED]");
    expect(state.failure).toContain("Bearer [REDACTED]");
    expect(state.failure).not.toContain("canary-secret");
    expect(JSON.stringify(await coordinator.events(created.runId))).not.toContain("abc.def.ghi");
    expect(await readFile(path.join(root, "runs", "local-server", created.runId, "events.ndjson"), "utf8")).not.toContain("canary-secret");
  });
});
