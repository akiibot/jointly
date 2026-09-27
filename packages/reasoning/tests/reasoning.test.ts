/**
 * Tests for @jointly/reasoning.
 *
 * These tests are entirely offline: no network access, no credentials.
 * They verify contracts, error types, engine retry logic, stage validation,
 * and context helpers.
 */

import { describe, it, expect, vi } from "vitest";
import {
  InferenceError,
  InferenceErrorCode,
  type InferenceTransport,
  type GenerationRequest,
  type GenerationResponse,
  type ProviderConfig,
} from "../src/contracts.js";
import { runWithRetry } from "../src/engine.js";
import {
  redact,
  safeDiagnostics,
  missingConfigError,
  authFailedError,
  forbiddenError,
  rateLimitedError,
  providerError,
  timeoutError,
  cancelledError,
  malformedResponseError,
  retryLimitExceededError,
} from "../src/errors.js";
import { parseStagePayload, assertStageId } from "../src/templates.js";
import { withSignal, withDeadline, remainingDeadlineMs } from "../src/context.js";
import { loadProviderConfig, validateProviderConfig } from "../src/provider-config.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseConfig: ProviderConfig = {
  serviceUrl: "https://us-south.ml.cloud.ibm.com",
  projectId:  "test-project-id",
  modelId:    "ibm/granite-13b-instruct-v2",
  apiVersion: "2024-03-14",
};

const baseRequest: GenerationRequest = {
  prompt: "Hello world",
  maxNewTokens: 50,
};

const successResponse: GenerationResponse = {
  generatedText:       "Generated output.",
  finishReason:        "stop",
  requestId:           "req-123",
  inputTokenCount:     5,
  generatedTokenCount: 3,
};

function makeTransport(
  fn: (
    config: ProviderConfig,
    req: GenerationRequest,
  ) => Promise<GenerationResponse>,
): InferenceTransport {
  return { generate: fn };
}

// ---------------------------------------------------------------------------
// InferenceError contract
// ---------------------------------------------------------------------------

describe("InferenceError", () => {
  it("carries the expected code and message", () => {
    const err = new InferenceError({
      code: InferenceErrorCode.AUTH_FAILED,
      message: "401 unauthorized",
      httpStatus: 401,
      retryable: false,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(InferenceErrorCode.AUTH_FAILED);
    expect(err.message).toBe("401 unauthorized");
    expect(err.httpStatus).toBe(401);
    expect(err.retryable).toBe(false);
    expect(err.name).toBe("InferenceError");
  });

  it("defaults retryable to false", () => {
    const err = new InferenceError({
      code: InferenceErrorCode.TIMEOUT,
      message: "timed out",
    });
    expect(err.retryable).toBe(false);
  });

  it("accepts cause", () => {
    const cause = new Error("root");
    const err = new InferenceError({
      code: InferenceErrorCode.PROVIDER_ERROR,
      message: "wrapped",
      cause,
    });
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// Error factories
// ---------------------------------------------------------------------------

describe("error factories", () => {
  it("missingConfigError names missing variables", () => {
    const err = missingConfigError(["WATSONX_API_KEY", "WATSONX_PROJECT_ID"]);
    expect(err.code).toBe(InferenceErrorCode.MISSING_CONFIG);
    expect(err.message).toContain("WATSONX_API_KEY");
    expect(err.message).toContain("WATSONX_PROJECT_ID");
    expect(err.retryable).toBe(false);
  });

  it("authFailedError carries 401", () => {
    const err = authFailedError({ httpStatus: 401 });
    expect(err.code).toBe(InferenceErrorCode.AUTH_FAILED);
    expect(err.httpStatus).toBe(401);
    expect(err.retryable).toBe(false);
  });

  it("forbiddenError carries 403", () => {
    const err = forbiddenError({ httpStatus: 403 });
    expect(err.code).toBe(InferenceErrorCode.FORBIDDEN);
    expect(err.httpStatus).toBe(403);
    expect(err.retryable).toBe(false);
  });

  it("rateLimitedError is retryable", () => {
    const err = rateLimitedError({ retryAfterMs: 2000 });
    expect(err.code).toBe(InferenceErrorCode.RATE_LIMITED);
    expect(err.retryable).toBe(true);
    expect(err.diagnostics).toMatchObject({ retryAfterMs: 2000 });
  });

  it("providerError marks 5xx as retryable", () => {
    const err = providerError({ httpStatus: 503, details: "Service unavailable" });
    expect(err.code).toBe(InferenceErrorCode.PROVIDER_ERROR);
    expect(err.httpStatus).toBe(503);
    expect(err.retryable).toBe(true);
  });

  it("timeoutError is retryable", () => {
    const err = timeoutError({ deadlineMs: 5000 });
    expect(err.code).toBe(InferenceErrorCode.TIMEOUT);
    expect(err.retryable).toBe(true);
  });

  it("cancelledError is not retryable", () => {
    const err = cancelledError();
    expect(err.code).toBe(InferenceErrorCode.CANCELLED);
    expect(err.retryable).toBe(false);
  });

  it("malformedResponseError is not retryable", () => {
    const err = malformedResponseError({ details: "bad json" });
    expect(err.code).toBe(InferenceErrorCode.MALFORMED_RESPONSE);
    expect(err.retryable).toBe(false);
  });

  it("retryLimitExceededError records attempt count", () => {
    const err = retryLimitExceededError({
      attempts: 3,
      lastCode: InferenceErrorCode.TIMEOUT,
    });
    expect(err.code).toBe(InferenceErrorCode.RETRY_LIMIT_EXCEEDED);
    expect(err.diagnostics).toMatchObject({ attempts: 3 });
    expect(err.retryable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

describe("redact", () => {
  it("removes Bearer tokens", () => {
    const result = redact("Authorization: Bearer abc123def");
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("abc123def");
  });

  it("removes WATSONX_API_KEY values", () => {
    const result = redact("WATSONX_API_KEY=my-secret-key more text");
    expect(result).not.toContain("my-secret-key");
  });

  it("preserves non-sensitive text", () => {
    const result = redact("model_id: ibm/granite");
    expect(result).toBe("model_id: ibm/granite");
  });
});

describe("safeDiagnostics", () => {
  it("redacts credential-named keys", () => {
    const diag = safeDiagnostics({
      apiKey: "secret123",
      httpStatus: 503,
      modelId: "ibm/granite",
    });
    expect(diag["apiKey"]).toBe("[REDACTED]");
    expect(diag["httpStatus"]).toBe(503);
    expect(diag["modelId"]).toBe("ibm/granite");
  });
});

// ---------------------------------------------------------------------------
// Engine retry logic
// ---------------------------------------------------------------------------

describe("runWithRetry", () => {
  it("resolves on first attempt when transport succeeds", async () => {
    const transport = makeTransport(async () => successResponse);
    const result = await runWithRetry(transport, baseConfig, baseRequest, {
      maxStageAttempts: 3,
      baseDelayMs: 0,
      maxDelayMs: 0,
    });
    expect(result).toEqual(successResponse);
  });

  it("retries retryable errors and eventually resolves", async () => {
    let calls = 0;
    const transport = makeTransport(async () => {
      calls++;
      if (calls < 3) {
        throw new InferenceError({
          code: InferenceErrorCode.PROVIDER_ERROR,
          message: "transient",
          retryable: true,
        });
      }
      return successResponse;
    });
    const result = await runWithRetry(transport, baseConfig, baseRequest, {
      maxStageAttempts: 3,
      baseDelayMs: 0,
      maxDelayMs: 0,
    });
    expect(result).toEqual(successResponse);
    expect(calls).toBe(3);
  });

  it("propagates non-retryable errors immediately without retry", async () => {
    let calls = 0;
    const transport = makeTransport(async () => {
      calls++;
      throw new InferenceError({
        code: InferenceErrorCode.AUTH_FAILED,
        message: "bad key",
        retryable: false,
      });
    });
    await expect(
      runWithRetry(transport, baseConfig, baseRequest, {
        maxStageAttempts: 3,
        baseDelayMs: 0,
        maxDelayMs: 0,
      }),
    ).rejects.toMatchObject({ code: InferenceErrorCode.AUTH_FAILED });
    expect(calls).toBe(1); // Did not retry
  });

  it("exhausts maxStageAttempts and throws the last error", async () => {
    let calls = 0;
    const transport = makeTransport(async () => {
      calls++;
      throw new InferenceError({
        code: InferenceErrorCode.TIMEOUT,
        message: "timed out",
        retryable: true,
      });
    });
    await expect(
      runWithRetry(transport, baseConfig, baseRequest, {
        maxStageAttempts: 3,
        baseDelayMs: 0,
        maxDelayMs: 0,
      }),
    ).rejects.toMatchObject({ code: InferenceErrorCode.TIMEOUT });
    expect(calls).toBe(3);
  });

  it("transport retries do not multiply engine retries", async () => {
    // Simulate a transport that internally retried 2x before failing.
    // The engine should see it as a single failure and count its own attempts.
    let engineCalls = 0;
    const transport = makeTransport(async () => {
      engineCalls++;
      // Transport already tried internally before throwing once to engine
      throw new InferenceError({
        code: InferenceErrorCode.PROVIDER_ERROR,
        message: "final transport failure",
        retryable: true,
      });
    });
    await expect(
      runWithRetry(transport, baseConfig, baseRequest, {
        maxStageAttempts: 2,
        baseDelayMs: 0,
        maxDelayMs: 0,
      }),
    ).rejects.toMatchObject({ code: InferenceErrorCode.PROVIDER_ERROR });
    // Engine calls transport exactly maxStageAttempts times
    expect(engineCalls).toBe(2);
  });

  it("respects AbortSignal — rejects immediately when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const transport = makeTransport(async () => successResponse);
    await expect(
      runWithRetry(
        transport,
        baseConfig,
        { ...baseRequest, signal: controller.signal },
        { maxStageAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
      ),
    ).rejects.toMatchObject({ code: InferenceErrorCode.CANCELLED });
  });

  it("aborting prevents new work", async () => {
    const controller = new AbortController();
    let calls = 0;
    const transport = makeTransport(async () => {
      calls++;
      // Abort after first call during the retry wait
      controller.abort();
      throw new InferenceError({
        code: InferenceErrorCode.TIMEOUT,
        message: "timeout",
        retryable: true,
      });
    });
    await expect(
      runWithRetry(
        transport,
        baseConfig,
        { ...baseRequest, signal: controller.signal },
        { maxStageAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
      ),
    ).rejects.toMatchObject({ code: InferenceErrorCode.CANCELLED });
    // Should not have made a second call to transport
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Stage payload validation
// ---------------------------------------------------------------------------

describe("parseStagePayload", () => {
  it("parses a valid payload", () => {
    const payload = parseStagePayload(
      JSON.stringify({ stage: "intent-extraction", content: { foo: 1 } }),
    );
    expect(payload.stage).toBe("intent-extraction");
    expect(payload.content).toMatchObject({ foo: 1 });
  });

  it("throws SCHEMA_INVALID on empty input", () => {
    expect(() => parseStagePayload("")).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });

  it("throws SCHEMA_INVALID on malformed JSON", () => {
    expect(() => parseStagePayload("{not valid}")).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });

  it("throws SCHEMA_INVALID if stage field is missing", () => {
    expect(() =>
      parseStagePayload(JSON.stringify({ content: {} })),
    ).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });

  it("throws SCHEMA_INVALID if content field is missing", () => {
    expect(() =>
      parseStagePayload(JSON.stringify({ stage: "x" })),
    ).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });
});

describe("assertStageId", () => {
  it("passes when stage id matches", () => {
    const p = { stage: "intent-extraction", content: {} };
    expect(() => assertStageId(p, "intent-extraction")).not.toThrow();
  });

  it("throws SCHEMA_INVALID when stage id mismatches", () => {
    const p = { stage: "wrong-stage", content: {} };
    expect(() => assertStageId(p, "intent-extraction")).toThrow(
      expect.objectContaining({ code: InferenceErrorCode.SCHEMA_INVALID }),
    );
  });
});

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

describe("context helpers", () => {
  it("withSignal replaces the signal", () => {
    const ctx = {
      providerConfig: baseConfig,
      signal: undefined,
      runId: "run-1",
    };
    const newSignal = new AbortController().signal;
    const derived = withSignal(ctx, newSignal);
    expect(derived.signal).toBe(newSignal);
    expect(derived.runId).toBe("run-1");
  });

  it("withDeadline sets runDeadlineEpochMs approximately correctly", () => {
    const now = Date.now();
    const ctx = { providerConfig: baseConfig };
    const derived = withDeadline(ctx, 5000);
    expect(derived.runDeadlineEpochMs).toBeGreaterThanOrEqual(now + 4900);
    expect(derived.runDeadlineEpochMs).toBeLessThanOrEqual(now + 5100);
  });

  it("remainingDeadlineMs returns undefined when no deadline", () => {
    const ctx = { providerConfig: baseConfig };
    expect(remainingDeadlineMs(ctx)).toBeUndefined();
  });

  it("remainingDeadlineMs returns positive value for future deadline", () => {
    const ctx = withDeadline({ providerConfig: baseConfig }, 5000);
    const remaining = remainingDeadlineMs(ctx);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(5000);
  });

  it("remainingDeadlineMs returns 0 for expired deadline", () => {
    const ctx = {
      providerConfig: baseConfig,
      runDeadlineEpochMs: Date.now() - 1000,
    };
    expect(remainingDeadlineMs(ctx)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Provider config validation
// ---------------------------------------------------------------------------

describe("validateProviderConfig", () => {
  it("passes for complete config", () => {
    expect(() =>
      validateProviderConfig({
        apiKey:     "test-key",
        serviceUrl: "https://us-south.ml.cloud.ibm.com",
        projectId:  "proj-id",
        modelId:    "ibm/granite",
        apiVersion: "2024-03-14",
      }),
    ).not.toThrow();
  });

  it("throws MISSING_CONFIG when apiKey is absent", () => {
    expect(() =>
      validateProviderConfig({
        serviceUrl: "https://us-south.ml.cloud.ibm.com",
        projectId:  "proj",
        modelId:    "ibm/granite",
        apiVersion: "2024-03-14",
      }),
    ).toThrow(expect.objectContaining({ code: InferenceErrorCode.MISSING_CONFIG }));
  });
});

describe("loadProviderConfig", () => {
  it("throws MISSING_CONFIG when env vars are absent", () => {
    // Ensure none of the env vars are set
    const origApiKey     = process.env["WATSONX_API_KEY"];
    const origServiceUrl = process.env["WATSONX_SERVICE_URL"];
    const origProjectId  = process.env["WATSONX_PROJECT_ID"];
    const origModelId    = process.env["WATSONX_MODEL_ID"];

    delete process.env["WATSONX_API_KEY"];
    delete process.env["WATSONX_SERVICE_URL"];
    delete process.env["WATSONX_PROJECT_ID"];
    delete process.env["WATSONX_MODEL_ID"];

    try {
      expect(() => loadProviderConfig()).toThrow(
        expect.objectContaining({ code: InferenceErrorCode.MISSING_CONFIG }),
      );
    } finally {
      if (origApiKey !== undefined)     process.env["WATSONX_API_KEY"]     = origApiKey;
      if (origServiceUrl !== undefined) process.env["WATSONX_SERVICE_URL"] = origServiceUrl;
      if (origProjectId !== undefined)  process.env["WATSONX_PROJECT_ID"]  = origProjectId;
      if (origModelId !== undefined)    process.env["WATSONX_MODEL_ID"]    = origModelId;
    }
  });

  it("reads all five aliases from environment", () => {
    const saved = {
      apiKey:     process.env["WATSONX_API_KEY"],
      serviceUrl: process.env["WATSONX_SERVICE_URL"],
      projectId:  process.env["WATSONX_PROJECT_ID"],
      modelId:    process.env["WATSONX_MODEL_ID"],
      apiVersion: process.env["WATSONX_API_VERSION"],
    };

    process.env["WATSONX_API_KEY"]     = "test-api-key";
    process.env["WATSONX_SERVICE_URL"] = "https://us-south.ml.cloud.ibm.com";
    process.env["WATSONX_PROJECT_ID"]  = "test-project";
    process.env["WATSONX_MODEL_ID"]    = "ibm/granite-13b-instruct-v2";
    process.env["WATSONX_API_VERSION"] = "2024-03-14";

    try {
      const config = loadProviderConfig();
      expect(config.serviceUrl).toBe("https://us-south.ml.cloud.ibm.com");
      expect(config.projectId).toBe("test-project");
      expect(config.modelId).toBe("ibm/granite-13b-instruct-v2");
      expect(config.apiVersion).toBe("2024-03-14");
      // API key must be present but we must not assert its value in snapshots
      expect(config.apiKey).toBeTruthy();
      // Safety: the value should not appear in any stringified diagnostics
      const serialised = JSON.stringify(config);
      expect(serialised).not.toContain("test-api-key");
    } finally {
      // Restore original environment
      if (saved.apiKey !== undefined)     process.env["WATSONX_API_KEY"]     = saved.apiKey;
      else                                delete process.env["WATSONX_API_KEY"];
      if (saved.serviceUrl !== undefined) process.env["WATSONX_SERVICE_URL"] = saved.serviceUrl;
      else                                delete process.env["WATSONX_SERVICE_URL"];
      if (saved.projectId !== undefined)  process.env["WATSONX_PROJECT_ID"]  = saved.projectId;
      else                                delete process.env["WATSONX_PROJECT_ID"];
      if (saved.modelId !== undefined)    process.env["WATSONX_MODEL_ID"]    = saved.modelId;
      else                                delete process.env["WATSONX_MODEL_ID"];
      if (saved.apiVersion !== undefined) process.env["WATSONX_API_VERSION"] = saved.apiVersion;
      else                                delete process.env["WATSONX_API_VERSION"];
    }
  });
});
