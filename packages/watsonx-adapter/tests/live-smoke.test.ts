/**
 * Live smoke test for @jointly/watsonx-adapter.
 *
 * SKIPPED BY DEFAULT.  This test will incur real provider cost and requires
 * live credentials set in the current process environment.
 *
 * Do NOT run this test in CI or without explicit operator authorisation.
 *
 * To run:
 *   JOINTLY_LIVE_SMOKE=1 npm test --workspace=packages/watsonx-adapter -- --run live-smoke
 *
 * Required environment variables:
 *   WATSONX_API_KEY       — IBM Cloud IAM API key
 *   WATSONX_SERVICE_URL   — Base URL
 *   WATSONX_PROJECT_ID    — Project identifier
 *   WATSONX_MODEL_ID      — Model identifier
 *   WATSONX_API_VERSION   — (optional) API version
 *
 * NOTE: Credentials must never be committed to source files, YAML, or logs.
 */

import { describe, it, expect } from "vitest";
import { loadProviderConfig } from "@jointly/reasoning";
import { WatsonxTransport } from "../src/watsonx-transport.js";

const LIVE = process.env["JOINTLY_LIVE_SMOKE"] === "1";

describe.skipIf(!LIVE)("live smoke test — requires credentials and network", () => {
  it("generates text from the configured model", async () => {
    const config = loadProviderConfig();
    const transport = new WatsonxTransport();
    const response = await transport.generate(config, {
      prompt:       "Say 'hello' and nothing else.",
      maxNewTokens: 10,
    });

    expect(typeof response.generatedText).toBe("string");
    expect(response.generatedText.length).toBeGreaterThan(0);
    // Metadata should be available from a live call
    console.info("[live-smoke] requestId:", response.requestId);
    console.info("[live-smoke] finishReason:", response.finishReason);
    console.info("[live-smoke] inputTokenCount:", response.inputTokenCount);
    console.info("[live-smoke] generatedTokenCount:", response.generatedTokenCount);
    // Canary: ensure no credential leaked into the response object
    const serialized = JSON.stringify(response);
    expect(serialized).not.toMatch(/[Aa][Pp][Ii][Kk][Ee][Yy]/);
  });
});
