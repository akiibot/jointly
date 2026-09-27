import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderDashboard, renderError, renderImportMode, renderLocalMode } from "../src/dashboard";
import { passportView, verdictPresentation } from "../src/components/PassportView";
import { classifyLocalRun, LocalServiceError, parseLocalCapabilities, parseLocalEvents, parseLocalPreflight, parseLocalRefs, parseLocalRuns } from "../src/local-client";
import { loadPassport, MAX_PASSPORT_BYTES, PassportError, parsePassport, passportFromFile, testMatrix } from "../src/passport";

describe("dashboard passport rendering", () => {
  it("renders all five screens from a valid passport", async () => {
    const raw = await readFile(path.resolve("public/passport.json"), "utf8");
    const html = renderDashboard(parsePassport(JSON.parse(raw)));
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain("From two prompts to one defensible decision");
    expect(html).toContain("Bob IDE or watsonx.ai may propose reasoning");
    expect(html).toContain('id="overview"');
    expect(html).toContain('id="intent"');
    expect(html).toContain('id="investigation"');
    expect(html).toContain('id="repair"');
    expect(html).toContain('id="passport"');
    expect(html).toContain('href="#roadmap"');
    expect(html).toContain('id="roadmap"');
    expect(html).toContain("Keep the proof. Expand the reach.");
    expect(html).toContain("No automatic merge.");
    expect(html).toContain("LEGACY UNVERIFIED · RECORDED SAFE TO MERGE");
    expect(html).toContain("COUPON-1");
    expect(html).toContain("PAYMENT-3");
  });

  it("labels sample and imported evidence as distinct modes", async () => {
    const passport = parsePassport(JSON.parse(await readFile(path.resolve("public/passport.json"), "utf8")));
    const sample = renderDashboard(passport, { mode: "sample", source: "bundled historical passport.json" });
    const imported = renderDashboard(passport, { mode: "imported", source: "selected.json" });
    expect(sample).toContain("Sample demonstration");
    expect(sample).toContain("Nothing is running now");
    expect(sample).toContain("bundled historical passport.json");
    expect(imported).toContain("Imported passport");
    expect(imported).toContain("selected.json");
  });

  it("renders local failure without sample success or a nonfunctional run button", () => {
    const html = renderLocalMode({ status: "unavailable", error: "Local Jointly service returned 404." });
    expect(html).toContain("Connected local investigation");
    expect(html).toContain("No sample result has been substituted");
    expect(html).not.toContain("SAFE TO MERGE");
    expect(html).not.toContain(">Run<");
    expect(renderImportMode("bad import")).toContain("bad import");
  });

  it("validates and renders honest local capabilities", () => {
    const capabilities = parseLocalCapabilities({
      schemaVersion: "1",
      fakeReplay: true,
      realInference: false,
      generatedCodeExecution: false,
      isolationProfile: "unavailable",
      blockers: ["credential-separated executor isolation"],
    });
    const preflight = parseLocalPreflight({
      schemaVersion: "1", deterministicReady: true, providerReady: false,
      checks: [{ id: "runtime.node", status: "pass", message: "Node is pinned." }],
    });
    const runs = parseLocalRuns([{
      schemaVersion: "2", runId: "00000000-0000-4000-8000-000000000001",
      profile: "checkout-fixture", mode: "fake-replay", status: "completed", currentStage: null,
      verdict: "INSUFFICIENT_EVIDENCE", createdAt: "2026-09-27T00:00:00.000Z", updatedAt: "2026-09-27T00:01:00.000Z",
    }]);
    const refs = parseLocalRefs({
      schemaVersion: "1",
      base: { ref: "jointly-demo-base", commit: "a".repeat(40) },
      changes: [
        { id: "coupon", ref: "origin/agent/coupon", commit: "b".repeat(40), promptFile: "scenarios/checkout/coupon-prompt.md" },
        { id: "payment-retry", ref: "origin/agent/payment-retry", commit: "c".repeat(40), promptFile: "scenarios/checkout/payment-retry-prompt.md" },
      ],
    });
    const html = renderLocalMode({ status: "ready", capabilities, preflight, refs, runs });
    expect(html).toContain("Fake replay");
    expect(html).toContain("Real inference");
    expect(html).toContain("credential-separated executor isolation");
    expect(html).toContain("Deterministic preflight");
    expect(html).toContain("INSUFFICIENT_EVIDENCE");
    expect(html).toContain("HttpOnly same-origin cookie");
    expect(html).toContain("jointly-demo-base");
    expect(html).toContain("origin/agent/payment-retry");
    expect(html).toContain("scenarios/checkout/coupon-prompt.md");
    expect(html).toContain("Start simulated replay");
    expect(html).toContain("performs no watsonx inference");
    expect(html).not.toContain(">Run investigation<");
    expect(() => parseLocalCapabilities({ schemaVersion: "2" })).toThrow("Unsupported");
    expect(() => parseLocalPreflight({ schemaVersion: "1", deterministicReady: true, providerReady: true, checks: [] })).toThrow("incomplete");
    expect(() => parseLocalRuns([{ schemaVersion: "2", status: "completed" }])).toThrow("invalid");
    expect(() => parseLocalRefs({ schemaVersion: "1", base: { ref: "base", commit: "bad" }, changes: [] })).toThrow();
    expect(() => parseLocalRefs({
      schemaVersion: "1", base: { ref: "base", commit: "a".repeat(40) },
      changes: [
        { id: "same", ref: "a", commit: "b".repeat(40), promptFile: "a.md" },
        { id: "same", ref: "b", commit: "c".repeat(40), promptFile: "b.md" },
      ],
    })).toThrow("unique");
  });

  it("distinguishes local failure categories and exposes authenticated evidence links", () => {
    const runs = parseLocalRuns([
      { schemaVersion: "2", runId: "00000000-0000-4000-8000-000000000001", profile: "checkout-fixture", mode: "fake-replay", status: "completed", currentStage: null, verdict: "COLLISION_CONFIRMED", createdAt: "2026-09-27T00:00:00.000Z", updatedAt: "2026-09-27T00:01:00.000Z" },
      { schemaVersion: "2", runId: "00000000-0000-4000-8000-000000000002", profile: "checkout-fixture", mode: "fake-replay", status: "interrupted", currentStage: null, failure: "Worker restarted.", createdAt: "2026-09-27T00:00:00.000Z", updatedAt: "2026-09-27T00:01:00.000Z" },
      { schemaVersion: "2", runId: "00000000-0000-4000-8000-000000000003", profile: "checkout-fixture", mode: "fake-replay", status: "failed", currentStage: null, failure: "Test setup import failed.", createdAt: "2026-09-27T00:00:00.000Z", updatedAt: "2026-09-27T00:01:00.000Z" },
    ]);
    expect(runs.map(classifyLocalRun)).toEqual(["collision", "interrupted", "test-setup-failed"]);
    const html = renderLocalMode({ status: "ready", runs });
    expect(html).toContain("Collision found");
    expect(html).toContain("Run interrupted");
    expect(html).toContain("Test setup failed");
    expect(html).toContain("/passport");
    expect(renderLocalMode({ status: "unavailable", errorKind: "authentication-failure", error: "Denied" })).toContain("Authentication failed");
    expect(new LocalServiceError("budget-exhausted", "Budget exhausted", 429).kind).toBe("budget-exhausted");
    const event = { schemaVersion: "1", sequence: 1, runId: runs[0]!.runId, at: "2026-09-27T00:00:00.000Z", type: "stage-started", stage: "baseline", message: "Baseline started." };
    const events = parseLocalEvents(`id: 1\nevent: stage-started\ndata: ${JSON.stringify(event)}\n\n`, runs[0]!.runId);
    expect(renderLocalMode({ status: "ready", runs, events })).toContain("Baseline started.");
    expect(() => parseLocalEvents(`data: ${JSON.stringify({ ...event, runId: "wrong" })}\n\n`, runs[0]!.runId)).toThrow("invalid");
  });

  it("rejects malformed passports and provides a safe error state", () => {
    expect(() => parsePassport({ verdict: "SAFE_TO_MERGE" })).toThrow(PassportError);
    const html = renderError("passport.json is missing a valid runId.");
    expect(html).toContain("Passport unavailable");
    expect(html).toContain("Choose passport.json");
  });

  it("requires verification gates for current passports and never upgrades legacy proof", () => {
    const base = {
      runId: "run-1",
      verdict: "SAFE_TO_MERGE",
      summary: "Historical claim",
      changes: [
        { id: "a", ref: "a", resolvedCommit: "aaa" },
        { id: "b", ref: "b", resolvedCommit: "bbb" },
      ],
    };
    expect(parsePassport(base).importStatus).toBe("legacy-unverified");
    expect(() => parsePassport({ ...base, schemaVersion: "2" })).toThrow("verification gates");
    expect(parsePassport({
      ...base,
      schemaVersion: "2",
      changes: [
        { id: "a", ref: "a", resolvedCommit: "a".repeat(40), promptPath: "a.md" },
        { id: "b", ref: "b", resolvedCommit: "b".repeat(40), promptPath: "b.md" },
      ],
      verificationGates: { passed: true, failures: [] },
    }).importStatus).toBe("current");
  });

  it("renders every current verdict with explicit, non-success styling for non-safe outcomes", () => {
    const expected = {
      SAFE_TO_MERGE: "safe",
      COLLISION_CONFIRMED: "danger",
      REPAIR_REQUIRES_REVIEW: "warning",
      INDEPENDENT_CHANGE_FAILED: "danger",
      TEXTUAL_CONFLICT: "danger",
      INSUFFICIENT_EVIDENCE: "blocked",
    } as const;
    for (const [verdict, tone] of Object.entries(expected)) {
      const safe = verdict === "SAFE_TO_MERGE";
      const passport = parsePassport({
        schemaVersion: "2", runId: `run-${verdict}`, verdict, summary: `Summary for ${verdict}`,
        changes: [
          { id: "a", ref: "a", resolvedCommit: "a".repeat(40), promptPath: "a.md" },
          { id: "b", ref: "b", resolvedCommit: "b".repeat(40), promptPath: "b.md" },
        ],
        verificationGates: { passed: safe, failures: safe ? [] : ["evidence <gate> failed"] },
      });
      expect(verdictPresentation(passport).tone).toBe(tone);
      const html = passportView(passport);
      expect(html).toContain(`passport-card ${tone}`);
      if (!safe) expect(html).not.toContain("passport-card safe");
      expect(html).toContain(verdict.replaceAll("_", " "));
      if (!safe) {
        expect(html).toContain("Verification blockers");
        expect(html).toContain("evidence &lt;gate&gt; failed");
      }
    }
  });

  it("validates nested current evidence and reads the current existing-test summary", () => {
    const passport = parsePassport({
      schemaVersion: "2", runId: "run-current", verdict: "SAFE_TO_MERGE", summary: "Verified",
      changes: [
        { id: "a", ref: "a", resolvedCommit: "a".repeat(40), promptPath: "a.md" },
        { id: "b", ref: "b", resolvedCommit: "b".repeat(40), promptPath: "b.md" },
      ],
      verificationGates: { passed: true, failures: [] },
      verificationBasis: "repaired-collision",
      inputIntegrity: { valid: true, failures: [] },
      runtimeDiagnosis: { hypothesisId: "H-1", requirementIds: ["A-1"], interpretation: "Failure occurs at runtime.", evidenceArtifact: "collision-evidence.before-repair.json" },
      requirementResolutions: [{ id: "R-1", conflictingRequirementIds: ["A-1"], decision: "accepted-replacement", proposedReplacement: "Combined rule", rationale: "Operator approved.", authority: { kind: "operator", source: "decision 1" }, affectedTests: ["generated-tests/interaction.test.ts"] }],
      testResults: {
        schemaVersion: "2",
        beforeRepair: { combined: { workspace: "combined", exitCode: 1, timedOut: false } },
        afterRepair: { combined: { workspace: "combined", exitCode: 0, timedOut: false, testCounts: { total: 4, passed: 4, failed: 0 } } },
        fingerprints: {},
      },
      stability: { scenario: "checkout", iterations: 2, passed: 2, failed: 0, seed: 7, concurrency: 1, requestConcurrency: 8 },
    });
    expect(testMatrix(passport)).toEqual([{ workspace: "combined", result: expect.objectContaining({ exitCode: 0 }) }]);
    expect(() => parsePassport({ ...passport, stability: { iterations: 2, passed: 1, failed: 0 } })).toThrow("inconsistent");
    expect(() => parsePassport({ ...passport, intents: [{ changeId: "a", requirements: [{ id: "A-1", statement: 4 }] }] })).toThrow("statement");
    const html = renderDashboard(passport);
    expect(html).toContain("Current and verified");
    expect(html).toContain("Separate runtime diagnosis");
    expect(html).toContain("Requirement decisions");
    expect(html).toContain("Download validated passport");
    expect(() => parsePassport({ ...passport, requirementResolutions: [{ authority: "operator" }] })).toThrow("authority");
  });

  it("rejects oversized file and remote passport payloads before parsing", async () => {
    const oversized = new File([new Uint8Array(MAX_PASSPORT_BYTES + 1)], "passport.json", { type: "application/json" });
    await expect(passportFromFile(oversized)).rejects.toThrow("exceeds");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", {
      headers: { "content-length": String(MAX_PASSPORT_BYTES + 1), "content-type": "application/json" },
    }));
    await expect(loadPassport("/oversized.json")).rejects.toThrow("exceeds");
    fetchMock.mockRestore();
  });

  it("escapes passport content before rendering", () => {
    const passport = parsePassport({
      runId: "run-1",
      verdict: "COLLISION_CONFIRMED",
      summary: "<script>alert(1)</script>",
      changes: [
        { id: "a", ref: "agent/a", resolvedCommit: "abc12345" },
        { id: "b", ref: "agent/b", resolvedCommit: "def12345" }
      ]
    });
    const html = renderDashboard(passport);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
