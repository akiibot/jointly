import { reasoningTemplate, sha256, type ReasoningRequest } from "@jointly/reasoning";
import { describe, expect, it } from "vitest";
import { WatsonxInferenceTransport } from "../src/index.js";

const live = process.env.JOINTLY_LIVE_WATSONX_SMOKE === "1";

describe.skipIf(!live)("authorized live watsonx smoke", () => {
  it("returns a bounded structured response without exposing configuration", async () => {
    const template = reasoningTemplate("draft-report");
    const content = "Describe only the supplied evidence.";
    const request: ReasoningRequest = {
      schemaVersion: "1",
      runId: "live-smoke",
      attemptId: "live-smoke-1",
      stage: "draft-report",
      frozenInputDigest: sha256("live-smoke"),
      promptTemplate: { id: template.id, version: template.version, digest: template.digest },
      context: [{ id: "evidence", label: "Evidence", digest: sha256(content), content, classification: "evidence" }],
      model: { id: process.env.WATSONX_MODEL_ID!, maxOutputTokens: 128, temperature: 0 },
      deadlineAt: new Date(Date.now() + 30_000).toISOString(),
      budget: { remainingCalls: 1, remainingInputTokens: 1_000, remainingOutputTokens: 128, remainingDurationMs: 30_000 },
      allowedRequirementIds: [],
      allowedWritePrefixes: [],
    };
    const response = await new WatsonxInferenceTransport({ maxTransportAttempts: 1 })
      .infer(request, new AbortController().signal);
    expect(response.content.length).toBeGreaterThan(0);
    expect(JSON.stringify(response)).not.toContain(process.env.WATSONX_API_KEY);
  }, 40_000);
});
