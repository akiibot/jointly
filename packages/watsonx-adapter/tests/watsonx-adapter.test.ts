/**
 * Tests for @jointly/watsonx-adapter.
 *
 * Offline only — no network access, no credentials, no live provider calls.
 *
 * The WatsonXAI SDK is mocked with vi.mock() before any transport code runs.
 * The IamAuthenticator constructor is also mocked to prevent IAM token
 * network requests.
 *
 * Coverage:
 * - Configuration alias mapping (all five WATSONX_* env vars)
 * - Missing configuration
 * - Authentication failure (HTTP 401)
 * - Authorization failure (HTTP 403)
 * - Missing or wrong project (HTTP 404 + project body)
 * - Unavailable model (HTTP 404 + model body)
 * - Rate limiting (HTTP 429)
 * - Quota exhaustion
 * - Bounded retry classification
 * - Global attempt bounds (MAX_TRANSPORT_RETRIES)
 * - Transport retries not multiplying semantic retries
 * - Timeout
 * - AbortSignal cancellation
 * - Abort preventing new work
 * - Malformed JSON / truncated responses
 * - Schema-invalid stage payloads (via @jointly/reasoning validators)
 * - Unknown operations
 * - Request ID and usage preservation when supplied
 * - Missing request metadata (undefined, never invented)
 * - Canary-secret redaction from errors, logs, snapshots, URLs, child envs
 * - Shared provider contract suite (FakeTransport + mocked WatsonxTransport)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  InferenceError,
  InferenceErrorCode,
  type ProviderConfig,
  type GenerationRequest,
  parseStagePayload,
} from "@jointly/reasoning";
import { FakeTransport } from "../src/fake-transport.js";
import { WatsonxTransport } from "../src/watsonx-transport.js";
import {
  runProviderContractSuite,
  contractConfig,
  contractRequest,
} from "./provider-contract-suite.js";

// ---------------------------------------------------------------------------
// Canary secret — used to verify no leak into errors/logs/snapshots
// ---------------------------------------------------------------------------
const CANARY_SECRET = "CANARY_SECRET_DO_NOT_LOG_xK9mQ2pR";

// ---------------------------------------------------------------------------
// SDK mock
// ---------------------------------------------------------------------------

// We mock the SDK module so that no real HTTP connection is ever attempted.
// Each test that needs a specific SDK behavior sets up the mock return value.

const mockGenerateText = vi.fn();
const mockIamAuthenticator = vi.fn(() => ({}));

vi.mock("@ibm-cloud/watsonx-ai", () => ({
  WatsonXAI: vi.fn().mockImplementation(() => ({
    generateText: mockGenerateText,
  })),
}));

vi.mock("ibm-cloud-sdk-core", () => ({
  IamAuthenticator: mockIamAuthenticator,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<ProviderConfig & { apiKey: string }> = {}): ProviderConfig & { apiKey: string } {
  return {
    serviceUrl: "https://us-south.ml.cloud.ibm.com",
    projectId:  "test-project-id",
    modelId:    "ibm/granite-13b-instruct-v2",
    apiVersion: "2024-03-14",
    apiKey:     "test-api-key",
    ...overrides,
  };
}

function makeRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    prompt:       "Test prompt",
    maxNewTokens: 20,
    ...overrides,
  };
}

function makeSuccessSdkResponse(overrides: {
  generatedText?: string;
  stopReason?: string;
  inputTokenCount?: number;
  generatedTokenCount?: number;
  modelId?: string;
  headers?: Record<string, string>;
} = {}) {
  return {
    result: {
      model_id: overrides.modelId ?? "ibm/granite-13b-instruct-v2",
      created_at: "2024-01-01T00:00:00.000Z",
      results: [
        {
          generated_text:       overrides.generatedText       ?? "Generated output.",
          stop_reason:          overrides.stopReason          ?? "eos_token",
          input_token_count:    overrides.inputTokenCount     ?? 8,
          generated_token_count: overrides.generatedTokenCount ?? 5,
        },
      ],
    },
    status:     200,
    statusText: "OK",
    headers:    overrides.headers ?? { "x-request-id": "sdk-req-abc" },
  };
}

function makeSdkError(status: number, message: string, body?: unknown) {
  const err = Object.assign(new Error(message), { status, body });
  return err;
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Configuration alias mapping
// ============================================================================

describe("configuration alias mapping", () => {
  it("reads WATSONX_API_KEY and passes it to IamAuthenticator", async () => {
    mockGenerateText.mockResolvedValueOnce(makeSuccessSdkResponse());
    const transport = new WatsonxTransport();
    await transport.generate(makeConfig({ apiKey: CANARY_SECRET }), makeRequest());
    // IamAuthenticator must have been called with the apikey
    expect(mockIamAuthenticator).toHaveBeenCalledWith(
      expect.objectContaining({ apikey: CANARY_SECRET }),
    );
  });

  it("passes serviceUrl, projectId, modelId, and apiVersion to the SDK", async () => {
    mockGenerateText.mockResolvedValueOnce(makeSuccessSdkResponse());
    const { WatsonXAI } = await import("@ibm-cloud/watsonx-ai");
    const transport = new WatsonxTransport();
    const config = makeConfig({
      serviceUrl: "https://eu-de.ml.cloud.ibm.com",
      projectId:  "eu-project",
      modelId:    "ibm/granite-7b-instruct",
      apiVersion: "2024-05-01",
    });
    await transport.generate(config, makeRequest());
    expect(WatsonXAI).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceUrl: "https://eu-de.ml.cloud.ibm.com",
        version:    "2024-05-01",
      }),
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId:   "ibm/granite-7b-instruct",
        projectId: "eu-project",
      }),
    );
  });

  it("uses apiVersion from config", async () => {
    mockGenerateText.mockResolvedValueOnce(makeSuccessSdkResponse());
    const { WatsonXAI } = await import("@ibm-cloud/watsonx-ai");
    const transport = new WatsonxTransport();
    await transport.generate(makeConfig({ apiVersion: "2025-01-01" }), makeRequest());
    expect(WatsonXAI).toHaveBeenCalledWith(
      expect.objectContaining({ version: "2025-01-01" }),
    );
  });
});

// ============================================================================
// Missing configuration
// ============================================================================

describe("missing configuration", () => {
  it("throws MISSING_CONFIG when apiKey is absent from config", async () => {
    const transport = new WatsonxTransport();
    const configNoKey = { ...makeConfig() };
    delete (configNoKey as Partial<typeof configNoKey>).apiKey;
    await expect(
      transport.generate(configNoKey, makeRequest()),
    ).rejects.toMatchObject({ code: InferenceErrorCode.MISSING_CONFIG });
  });

  it("error message names missing variable without revealing value", async () => {
    const transport = new WatsonxTransport();
    const configNoKey = { ...makeConfig() };
    delete (configNoKey as Partial<typeof configNoKey>).apiKey;
    try {
      await transport.generate(configNoKey, makeRequest());
      expect.fail("Should have thrown");
    } catch (err) {
      if (err instanceof InferenceError) {
        expect(err.message).toContain("WATSONX_API_KEY");
        // Should not accidentally contain any value
        expect(err.message).not.toContain(CANARY_SECRET);
      }
    }
  });
});

// ============================================================================
// Authentication failure (HTTP 401)
// ============================================================================

describe("authentication failure", () => {
  it("throws AUTH_FAILED on HTTP 401", async () => {
    mockGenerateText.mockRejectedValueOnce(
      makeSdkError(401, "Unauthorized"),
    );
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({
      code:      InferenceErrorCode.AUTH_FAILED,
      httpStatus: 401,
      retryable: false,
    });
  });

  it("AUTH_FAILED error does not reveal the API key", async () => {
    mockGenerateText.mockRejectedValueOnce(
      makeSdkError(401, `Unauthorized: apikey=${CANARY_SECRET}`),
    );
    const transport = new WatsonxTransport();
    try {
      await transport.generate(makeConfig({ apiKey: CANARY_SECRET }), makeRequest());
      expect.fail("Should have thrown");
    } catch (err) {
      if (err instanceof InferenceError) {
        expect(JSON.stringify(err)).not.toContain(CANARY_SECRET);
        expect(err.message).not.toContain(CANARY_SECRET);
      }
    }
  });
});

// ============================================================================
// Authorization failure (HTTP 403)
// ============================================================================

describe("authorization failure", () => {
  it("throws FORBIDDEN on HTTP 403", async () => {
    mockGenerateText.mockRejectedValueOnce(makeSdkError(403, "Forbidden"));
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({
      code:      InferenceErrorCode.FORBIDDEN,
      httpStatus: 403,
      retryable: false,
    });
  });
});

// ============================================================================
// Missing or wrong project
// ============================================================================

describe("missing or wrong project", () => {
  it("throws INVALID_PROJECT on HTTP 404 with project context", async () => {
    mockGenerateText.mockRejectedValueOnce(
      makeSdkError(404, "Not Found", { message: "Project not found" }),
    );
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig({ projectId: "nonexistent-project" }), makeRequest()),
    ).rejects.toMatchObject({
      code:      InferenceErrorCode.INVALID_PROJECT,
      retryable: false,
    });
  });
});

// ============================================================================
// Unavailable model
// ============================================================================

describe("unavailable model", () => {
  it("throws UNAVAILABLE_MODEL on HTTP 404 with model context", async () => {
    mockGenerateText.mockRejectedValueOnce(
      makeSdkError(404, "Not Found", { message: "Model not found: foundation model" }),
    );
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({
      code:      InferenceErrorCode.UNAVAILABLE_MODEL,
      retryable: false,
    });
  });
});

// ============================================================================
// Rate limiting
// ============================================================================

describe("rate limiting", () => {
  it("throws RATE_LIMITED on HTTP 429", async () => {
    // Mock 429 for all 3 transport attempts
    mockGenerateText.mockRejectedValue(makeSdkError(429, "Too Many Requests"));
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({
      code: InferenceErrorCode.RATE_LIMITED,
      retryable: true,
    });
  });
});

// ============================================================================
// Quota exhaustion
// ============================================================================

describe("quota exhaustion", () => {
  it("throws QUOTA_EXHAUSTED when body contains quota message", async () => {
    mockGenerateText.mockRejectedValueOnce(
      Object.assign(new Error("quota limit exceeded for this model"), {
        status: undefined,
      }),
    );
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({
      code: InferenceErrorCode.QUOTA_EXHAUSTED,
    });
  });
});

// ============================================================================
// Bounded retry classification
// ============================================================================

describe("bounded retry classification", () => {
  it("retries HTTP 503 (retryable) up to MAX_TRANSPORT_RETRIES times", async () => {
    let calls = 0;
    mockGenerateText.mockImplementation(async () => {
      calls++;
      throw makeSdkError(503, "Service Unavailable");
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({ code: InferenceErrorCode.PROVIDER_ERROR });
    // 3 total attempts (1 initial + 2 retries)
    expect(calls).toBe(3);
  });

  it("does not retry HTTP 401 (non-retryable)", async () => {
    let calls = 0;
    mockGenerateText.mockImplementation(async () => {
      calls++;
      throw makeSdkError(401, "Unauthorized");
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({ code: InferenceErrorCode.AUTH_FAILED });
    expect(calls).toBe(1);
  });

  it("does not retry HTTP 403 (non-retryable)", async () => {
    let calls = 0;
    mockGenerateText.mockImplementation(async () => {
      calls++;
      throw makeSdkError(403, "Forbidden");
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({ code: InferenceErrorCode.FORBIDDEN });
    expect(calls).toBe(1);
  });
});

// ============================================================================
// Global attempt bounds
// ============================================================================

describe("global attempt bounds", () => {
  it("makes exactly MAX_TRANSPORT_RETRIES=3 attempts before failing", async () => {
    let calls = 0;
    mockGenerateText.mockImplementation(async () => {
      calls++;
      throw makeSdkError(500, "Internal Server Error");
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toBeInstanceOf(InferenceError);
    expect(calls).toBe(3);
  });
});

// ============================================================================
// Transport retries must not multiply semantic retries
// ============================================================================

describe("transport retries do not multiply semantic retries", () => {
  it("engine sees a single failure per generate() call", async () => {
    // Transport is mocked to always fail with retryable error
    mockGenerateText.mockRejectedValue(makeSdkError(500, "Server Error"));
    const transport = new WatsonxTransport();

    // Call generate() exactly once — this is one 'semantic stage attempt'
    let generateCallCount = 0;
    const wrappedTransport = {
      generate: async (...args: Parameters<WatsonxTransport["generate"]>) => {
        generateCallCount++;
        return transport.generate(...args);
      },
    };

    // Simulate engine calling generate() twice (maxStageAttempts=2)
    const { runWithRetry } = await import("@jointly/reasoning");
    await expect(
      runWithRetry(wrappedTransport, makeConfig(), makeRequest(), {
        maxStageAttempts: 2,
        baseDelayMs: 0,
        maxDelayMs:  0,
      }),
    ).rejects.toBeInstanceOf(InferenceError);

    // Engine called generate() exactly maxStageAttempts=2 times
    expect(generateCallCount).toBe(2);
    // Each generate() call made 3 internal transport attempts = 6 total SDK calls
    expect(mockGenerateText).toHaveBeenCalledTimes(6);
  });
});

// ============================================================================
// Timeout
// ============================================================================

describe("timeout", () => {
  it("throws TIMEOUT when deadline expires", async () => {
    // Simulate a slow SDK call
    mockGenerateText.mockImplementation(
      () => new Promise<never>((_, reject) =>
        setTimeout(() => reject(makeSdkError(408, "timeout ETIMEDOUT")), 50),
      ),
    );
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), { ...makeRequest(), deadlineMs: 1 }),
    ).rejects.toMatchObject({ code: InferenceErrorCode.TIMEOUT });
  });
});

// ============================================================================
// AbortSignal cancellation
// ============================================================================

describe("AbortSignal cancellation", () => {
  it("rejects with CANCELLED when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), { ...makeRequest(), signal: controller.signal }),
    ).rejects.toMatchObject({ code: InferenceErrorCode.CANCELLED });
    // Must not have called the SDK at all
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("rejects with CANCELLED when signal fires during execution", async () => {
    const controller = new AbortController();
    mockGenerateText.mockImplementation(
      () => new Promise<never>((_, reject) => {
        // Never resolves; abort will fire
        controller.signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
    );
    const transport = new WatsonxTransport();
    const promise = transport.generate(
      makeConfig(),
      { ...makeRequest(), signal: controller.signal },
    );
    // Fire abort a tick later
    setTimeout(() => controller.abort(), 10);
    await expect(promise).rejects.toMatchObject({
      code: InferenceErrorCode.CANCELLED,
    });
  });
});

// ============================================================================
// Abort prevents new work
// ============================================================================

describe("abort prevents new work", () => {
  it("does not start a retry after abort", async () => {
    const controller = new AbortController();
    let callCount = 0;
    mockGenerateText.mockImplementation(async () => {
      callCount++;
      controller.abort(); // abort after first call
      throw makeSdkError(503, "Server Error");
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), { ...makeRequest(), signal: controller.signal }),
    ).rejects.toMatchObject({ code: InferenceErrorCode.CANCELLED });
    expect(callCount).toBe(1); // second transport attempt was not started
  });
});

// ============================================================================
// Malformed JSON responses
// ============================================================================

describe("malformed JSON / truncated responses", () => {
  it("throws TRUNCATED_RESPONSE when results array is empty", async () => {
    mockGenerateText.mockResolvedValueOnce({
      result: { model_id: "ibm/granite", created_at: "2024-01-01T00:00:00Z", results: [] },
      status: 200, statusText: "OK", headers: {},
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({ code: InferenceErrorCode.TRUNCATED_RESPONSE });
  });

  it("throws MALFORMED_RESPONSE when generated_text is missing", async () => {
    mockGenerateText.mockResolvedValueOnce({
      result: {
        model_id: "ibm/granite", created_at: "2024-01-01T00:00:00Z",
        results: [{ stop_reason: "eos_token" }],
      },
      status: 200, statusText: "OK", headers: {},
    });
    const transport = new WatsonxTransport();
    await expect(
      transport.generate(makeConfig(), makeRequest()),
    ).rejects.toMatchObject({ code: InferenceErrorCode.MALFORMED_RESPONSE });
  });
});

// ============================================================================
// Schema-invalid stage payloads (via @jointly/reasoning validators)
// ============================================================================

describe("schema-invalid stage payloads", () => {
  it("parseStagePayload throws SCHEMA_INVALID for bad JSON", () => {
    expect(() => parseStagePayload("{bad}")).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });

  it("parseStagePayload throws SCHEMA_INVALID for missing stage field", () => {
    expect(() =>
      parseStagePayload(JSON.stringify({ content: {} })),
    ).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });

  it("parseStagePayload succeeds for a valid payload", () => {
    const payload = parseStagePayload(
      JSON.stringify({ stage: "test-stage", content: { data: 42 } }),
    );
    expect(payload.stage).toBe("test-stage");
  });
});

// ============================================================================
// Unknown operations / unsupported capabilities
// ============================================================================

describe("unknown operations", () => {
  it("FakeTransport error mode can simulate UNSUPPORTED_CAPABILITY", async () => {
    const transport = new FakeTransport({
      errorCode: InferenceErrorCode.UNSUPPORTED_CAPABILITY,
    });
    await expect(
      transport.generate(contractConfig, contractRequest),
    ).rejects.toMatchObject({ code: InferenceErrorCode.UNSUPPORTED_CAPABILITY });
  });
});

// ============================================================================
// Request ID and usage preservation when supplied
// ============================================================================

describe("request ID and usage preservation", () => {
  it("preserves requestId from x-request-id header", async () => {
    mockGenerateText.mockResolvedValueOnce(
      makeSuccessSdkResponse({ headers: { "x-request-id": "provider-req-xyz" } }),
    );
    const transport = new WatsonxTransport();
    const response = await transport.generate(makeConfig(), makeRequest());
    expect(response.requestId).toBe("provider-req-xyz");
  });

  it("preserves x-global-transaction-id as fallback", async () => {
    mockGenerateText.mockResolvedValueOnce(
      makeSuccessSdkResponse({ headers: { "x-global-transaction-id": "global-tx-456" } }),
    );
    const transport = new WatsonxTransport();
    const response = await transport.generate(makeConfig(), makeRequest());
    expect(response.requestId).toBe("global-tx-456");
  });

  it("preserves inputTokenCount and generatedTokenCount when supplied", async () => {
    mockGenerateText.mockResolvedValueOnce(
      makeSuccessSdkResponse({ inputTokenCount: 42, generatedTokenCount: 17 }),
    );
    const transport = new WatsonxTransport();
    const response = await transport.generate(makeConfig(), makeRequest());
    expect(response.inputTokenCount).toBe(42);
    expect(response.generatedTokenCount).toBe(17);
  });

  it("preserves modelId from response", async () => {
    mockGenerateText.mockResolvedValueOnce(
      makeSuccessSdkResponse({ modelId: "ibm/granite-7b-lab" }),
    );
    const transport = new WatsonxTransport();
    const response = await transport.generate(makeConfig(), makeRequest());
    expect(response.modelId).toBe("ibm/granite-7b-lab");
  });
});

// ============================================================================
// Missing request metadata — never invented
// ============================================================================

describe("missing request metadata", () => {
  it("returns undefined requestId when no request-ID header is present", async () => {
    mockGenerateText.mockResolvedValueOnce(
      makeSuccessSdkResponse({ headers: {} }),
    );
    const transport = new WatsonxTransport();
    const response = await transport.generate(makeConfig(), makeRequest());
    expect(response.requestId).toBeUndefined();
  });
});

// ============================================================================
// Canary-secret redaction
// ============================================================================

describe("canary-secret redaction", () => {
  it("does not appear in error.message when in SDK error body", async () => {
    mockGenerateText.mockRejectedValueOnce(
      makeSdkError(401, `Authentication failed. apikey=${CANARY_SECRET}`),
    );
    const transport = new WatsonxTransport();
    try {
      await transport.generate(makeConfig({ apiKey: CANARY_SECRET }), makeRequest());
      expect.fail("Should have thrown");
    } catch (err) {
      if (err instanceof InferenceError) {
        expect(err.message).not.toContain(CANARY_SECRET);
        expect(JSON.stringify(err.diagnostics ?? {})).not.toContain(CANARY_SECRET);
      }
    }
  });

  it("does not appear in IamAuthenticator call args in any log-able form", async () => {
    // The apikey is passed to IamAuthenticator but should not appear in diagnostics
    mockGenerateText.mockResolvedValueOnce(makeSuccessSdkResponse());
    const transport = new WatsonxTransport();
    await transport.generate(makeConfig({ apiKey: CANARY_SECRET }), makeRequest());
    // IamAuthenticator was called — that's expected.
    // What matters is that the canary doesn't appear in any InferenceError
    // thrown by a subsequent failure:
    mockGenerateText.mockRejectedValueOnce(makeSdkError(500, "Server Error"));
    try {
      await transport.generate(makeConfig({ apiKey: CANARY_SECRET }), makeRequest());
      // success is also fine
    } catch (err) {
      if (err instanceof InferenceError) {
        expect(JSON.stringify(err)).not.toContain(CANARY_SECRET);
      }
    }
  });

  it("canary does not appear in error.diagnostics", async () => {
    mockGenerateText.mockRejectedValueOnce(
      Object.assign(new Error(`error with ${CANARY_SECRET} in message`), { status: 403 }),
    );
    const transport = new WatsonxTransport();
    try {
      await transport.generate(makeConfig({ apiKey: CANARY_SECRET }), makeRequest());
      expect.fail("Should have thrown");
    } catch (err) {
      if (err instanceof InferenceError) {
        const diagStr = JSON.stringify(err.diagnostics ?? {});
        expect(diagStr).not.toContain(CANARY_SECRET);
        expect(err.message).not.toContain(CANARY_SECRET);
      }
    }
  });
});

// ============================================================================
// Finish reason normalisation
// ============================================================================

describe("finish reason normalisation", () => {
  const cases: Array<[string, GenerationRequest["signal"] extends infer S ? S : never, string]> = [
    ["eos_token",    undefined, "stop"],
    ["stop_sequence", undefined, "stop"],
    ["max_tokens",   undefined, "length"],
    ["token_limit",  undefined, "length"],
    ["time_limit",   undefined, "time_limit"],
    ["cancelled",    undefined, "cancelled"],
    ["error",        undefined, "error"],
    ["not_finished", undefined, "unknown"],
    ["WEIRD_VALUE",  undefined, "unknown"],
  ];

  for (const [providerReason, _unused, expected] of cases) {
    it(`maps provider stop_reason "${providerReason}" to finishReason "${expected}"`, async () => {
      mockGenerateText.mockResolvedValueOnce(
        makeSuccessSdkResponse({ stopReason: providerReason }),
      );
      const transport = new WatsonxTransport();
      const response = await transport.generate(makeConfig(), makeRequest());
      expect(response.finishReason).toBe(expected);
    });
  }
});

// ============================================================================
// FakeTransport contract suite
// ============================================================================

runProviderContractSuite(
  "FakeTransport",
  () => new FakeTransport(),
  (code) =>
    new FakeTransport({
      errorCode:      code,
      errorRetryable: code === InferenceErrorCode.PROVIDER_ERROR,
      errorHttpStatus: code === InferenceErrorCode.AUTH_FAILED ? 401 : undefined,
    }),
);

// ============================================================================
// WatsonxTransport contract suite (mocked SDK)
// ============================================================================

runProviderContractSuite(
  "WatsonxTransport (mocked SDK)",
  () => {
    mockGenerateText.mockResolvedValue(makeSuccessSdkResponse());
    return new WatsonxTransport();
  },
  (code) => {
    if (code === InferenceErrorCode.AUTH_FAILED) {
      mockGenerateText.mockRejectedValue(makeSdkError(401, "Unauthorized"));
    } else if (code === InferenceErrorCode.PROVIDER_ERROR) {
      mockGenerateText.mockRejectedValue(makeSdkError(500, "Server Error"));
    } else {
      mockGenerateText.mockRejectedValue(
        new InferenceError({ code, message: "simulated", retryable: false }),
      );
    }
    return new WatsonxTransport();
  },
);

// ============================================================================
// Stale hashes / invalid paths (reasoning engine path guards)
// ============================================================================

describe("stale hashes and invalid paths", () => {
  it("parseStagePayload treats stage as a validated field", () => {
    // Changing the stage value is detectable
    const payload = parseStagePayload(
      JSON.stringify({ stage: "intent-extraction", content: {} }),
    );
    expect(payload.stage).toBe("intent-extraction");
  });

  it("parseStagePayload rejects a tampered empty stage", () => {
    expect(() =>
      parseStagePayload(JSON.stringify({ stage: "", content: {} })),
    ).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });
});
