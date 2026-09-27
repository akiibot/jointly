/**
 * watsonx.ai transport adapter for @jointly/reasoning.
 *
 * SDK:    @ibm-cloud/watsonx-ai@1.7.16
 * Node:   >=20 (tested on 22.19.x and 24.12.x)
 *
 * Design invariants — see CONTRACT.md for the full specification.
 *
 * 1. IAM authentication is performed server-side via IamAuthenticator.
 *    The API key is read from WATSONX_API_KEY at call time; it is never
 *    logged, stored in errors, or passed to child processes.
 *
 * 2. Transport retries are bounded to MAX_TRANSPORT_RETRIES total attempts.
 *    Semantic-stage retries belong to the engine (runWithRetry) and are
 *    strictly separate; the two budgets cannot multiply.
 *
 * 3. All provider errors are mapped to typed InferenceError instances.
 *    Diagnostics are sanitised through safeDiagnostics() before use.
 *
 * 4. Metadata (requestId, token counts, modelId) is taken verbatim from the
 *    provider response.  Missing values are represented as `undefined`, never
 *    invented.
 *
 * 5. Aborting via signal or deadlineMs prevents new work.  Already-incurred
 *    provider cost may remain after cancellation.
 */

import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { IamAuthenticator } from "ibm-cloud-sdk-core";
import type {
  InferenceTransport,
  ProviderConfig,
  GenerationRequest,
  GenerationResponse,
  FinishReason,
} from "@jointly/reasoning";
import {
  InferenceError,
  InferenceErrorCode,
  safeDiagnostics,
  authFailedError,
  forbiddenError,
  invalidProjectError,
  unavailableModelError,
  rateLimitedError,
  quotaExhaustedError,
  providerError,
  timeoutError,
  cancelledError,
  malformedResponseError,
  truncatedResponseError,
  retryLimitExceededError,
} from "@jointly/reasoning";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum number of total transport-layer attempts (initial + retries).
 * This is separate from the engine's maxStageAttempts.
 */
const MAX_TRANSPORT_RETRIES = 3;

/** Base back-off delay in ms before the first transport retry. */
const TRANSPORT_BASE_DELAY_MS = 300;

/** Maximum back-off delay cap in ms. */
const TRANSPORT_MAX_DELAY_MS = 5_000;

/** HTTP status codes that are considered retryable at the transport level. */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

// ---------------------------------------------------------------------------
// Provider finish-reason normalisation
// ---------------------------------------------------------------------------

/**
 * Map the provider's stop_reason string to a normalised FinishReason.
 * Values are compared case-insensitively as documented in the SDK.
 */
function normaliseFinishReason(raw: string | undefined): FinishReason | undefined {
  if (raw === undefined) return undefined;
  switch (raw.toLowerCase()) {
    case "eos_token":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
    case "token_limit":
      return "length";
    case "time_limit":
      return "time_limit";
    case "cancelled":
      return "cancelled";
    case "error":
      return "error";
    case "not_finished":
      // still generating — treat as unknown from a completion standpoint
      return "unknown";
    default:
      return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Response-header request-ID extraction
// ---------------------------------------------------------------------------

/**
 * Extract the provider request ID from response headers.
 * Checks standard IBM headers in priority order; returns undefined if absent.
 * Never throws.
 */
function extractRequestId(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const candidates = [
    "x-request-id",
    "x-global-transaction-id",
    "x-correlation-id",
  ];
  for (const name of candidates) {
    const val = headers[name];
    if (typeof val === "string" && val.length > 0) return val;
    if (Array.isArray(val) && val[0]) return val[0];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/**
 * Classify an error thrown by the WatsonXAI SDK into a typed InferenceError.
 * Never leaks credentials into the returned error.
 */
function classifyError(
  err: unknown,
  requestId?: string,
): InferenceError {
  // Already normalised
  if (err instanceof InferenceError) return err;

  // The SDK throws errors with a numeric `status` or `statusCode` field
  const status =
    (err as { status?: number })?.status ??
    (err as { statusCode?: number })?.statusCode;

  const rawMessage =
    err instanceof Error ? err.message : String(err);

  // Extract body detail safely (never include headers/auth values)
  const body = (err as { body?: unknown })?.body;
  const bodyStr =
    typeof body === "string"
      ? body
      : typeof body === "object" && body !== null
      ? JSON.stringify(body)
      : undefined;

  const details = bodyStr ?? rawMessage;

  switch (status) {
    case 401:
      return authFailedError({ httpStatus: 401, requestId, details: safeDetail(details) });

    case 403:
      return forbiddenError({ httpStatus: 403, requestId, details: safeDetail(details) });

    case 404: {
      // Differentiate project-not-found from model-not-found by body text
      const lower = details.toLowerCase();
      if (lower.includes("model") || lower.includes("foundation")) {
        return unavailableModelError({ requestId });
      }
      return invalidProjectError({ requestId });
    }

    case 429:
      return rateLimitedError({ requestId });

    default: {
      if (status !== undefined && status >= 500) {
        return providerError({
          httpStatus: status,
          requestId,
          details: safeDetail(details),
        });
      }
      // Check for timeout signals in the error message
      if (
        rawMessage.includes("timeout") ||
        rawMessage.includes("ETIMEDOUT") ||
        rawMessage.includes("ECONNRESET")
      ) {
        return timeoutError({ requestId });
      }
      // Check for quota
      if (
        rawMessage.toLowerCase().includes("quota") ||
        rawMessage.toLowerCase().includes("limit exceeded")
      ) {
        return quotaExhaustedError({ requestId, details: safeDetail(rawMessage) });
      }
      return new InferenceError({
        code: InferenceErrorCode.PROVIDER_ERROR,
        message: `Unexpected provider error: ${safeDetail(rawMessage)}`,
        httpStatus: status,
        requestId,
        diagnostics: safeDiagnostics({ rawMessage: safeDetail(rawMessage) }),
        retryable: false,
      });
    }
  }
}

/** Truncate and redact a detail string before including in an error. */
function safeDetail(detail: string, maxLen = 256): string {
  const truncated = detail.length > maxLen ? detail.slice(0, maxLen) + "…" : detail;
  // Remove any bearer-token-shaped content
  return truncated
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer [REDACTED]")
    .replace(/apikey=[^\s&"]+/gi, "apikey=[REDACTED]");
}

// ---------------------------------------------------------------------------
// Back-off helper
// ---------------------------------------------------------------------------

function transportSleep(
  attempt: number,
  signal?: AbortSignal,
): Promise<void> {
  const delay = Math.min(
    TRANSPORT_BASE_DELAY_MS * 2 ** (attempt - 1),
    TRANSPORT_MAX_DELAY_MS,
  );
  const jitter = Math.random() * delay * 0.2;
  const ms = Math.round(delay + jitter);

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledError({
        note: "Already-incurred provider cost may remain after cancellation.",
      }));
      return;
    }
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(cancelledError({
          note: "Already-incurred provider cost may remain after cancellation.",
        }));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

// ---------------------------------------------------------------------------
// Core transport call
// ---------------------------------------------------------------------------

/**
 * Perform a single (no-retry) call to the watsonx.ai generateText API.
 * Wraps the SDK call with a deadline/abort race.
 */
async function callOnce(
  config: ProviderConfig & { apiKey: string },
  request: GenerationRequest,
): Promise<GenerationResponse> {
  const { apiKey, serviceUrl, projectId, modelId, apiVersion } = config;
  const { signal, deadlineMs } = request;

  // Abort check before doing any work
  if (signal?.aborted) {
    throw cancelledError({
      note: "Already-incurred provider cost may remain after cancellation.",
    });
  }

  // Build the SDK client with IAM authentication.
  // The API key stays inside the IamAuthenticator; it is not logged.
  const authenticator = new IamAuthenticator({ apikey: apiKey });
  const client = new WatsonXAI({
    version: apiVersion,
    serviceUrl,
    authenticator,
  });

  // Build generation parameters — only pass defined fields
  const parameters: Record<string, unknown> = {};
  if (request.maxNewTokens !== undefined)      parameters["max_new_tokens"]      = request.maxNewTokens;
  if (request.minNewTokens !== undefined)      parameters["min_new_tokens"]      = request.minNewTokens;
  if (request.temperature !== undefined)       parameters["temperature"]          = request.temperature;
  if (request.topP !== undefined)              parameters["top_p"]                = request.topP;
  if (request.repetitionPenalty !== undefined) parameters["repetition_penalty"]   = request.repetitionPenalty;
  if (request.stopSequences?.length)           parameters["stop_sequences"]       = request.stopSequences;
  if (deadlineMs !== undefined)                parameters["time_limit"]           = deadlineMs;

  // Race the SDK call against a deadline timer and AbortSignal
  const sdkPromise = client.generateText({
    input:      request.prompt,
    modelId,
    projectId,
    parameters: Object.keys(parameters).length > 0
      ? parameters as Parameters<typeof client.generateText>[0]["parameters"]
      : undefined,
  });

  // Build the abort/deadline race
  const racers: Promise<never>[] = [];

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  if (deadlineMs !== undefined && deadlineMs > 0) {
    racers.push(
      new Promise<never>((_, reject) => {
        deadlineTimer = setTimeout(() => {
          reject(timeoutError({ deadlineMs }));
        }, deadlineMs);
      }),
    );
  }

  if (signal) {
    racers.push(
      new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(cancelledError({
            note: "Already-incurred provider cost may remain after cancellation.",
          }));
          return;
        }
        signal.addEventListener(
          "abort",
          () => reject(cancelledError({
            note: "Already-incurred provider cost may remain after cancellation.",
          })),
          { once: true },
        );
      }),
    );
  }

  let rawResponse: Awaited<typeof sdkPromise>;
  try {
    if (racers.length > 0) {
      rawResponse = await Promise.race([sdkPromise, ...racers]);
    } else {
      rawResponse = await sdkPromise;
    }
  } finally {
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
  }

  // ---------------------------------------------------------------------------
  // Parse and validate the response
  // ---------------------------------------------------------------------------

  const requestId = extractRequestId(
    rawResponse.headers as Record<string, string | string[] | undefined>,
  );

  const result = rawResponse.result;

  if (!result || !Array.isArray(result.results) || result.results.length === 0) {
    throw truncatedResponseError({ requestId, details: "Empty results array." });
  }

  const firstResult = result.results[0];

  if (typeof firstResult.generated_text !== "string") {
    throw malformedResponseError({
      requestId,
      details: "Missing or non-string generated_text in first result.",
    });
  }

  if (firstResult.generated_text.trim().length === 0 &&
      firstResult.stop_reason?.toLowerCase() !== "eos_token" &&
      firstResult.stop_reason?.toLowerCase() !== "stop_sequence") {
    // Permit empty text only on natural stop; otherwise flag as truncated
    throw truncatedResponseError({
      requestId,
      details: "Empty generated_text with non-stop finish reason.",
    });
  }

  return {
    generatedText:       firstResult.generated_text,
    finishReason:        normaliseFinishReason(firstResult.stop_reason),
    requestId,
    inputTokenCount:     firstResult.input_token_count,
    generatedTokenCount: firstResult.generated_token_count,
    modelId:             result.model_id,
  };
}

// ---------------------------------------------------------------------------
// Transport implementation with bounded retries
// ---------------------------------------------------------------------------

/**
 * WatsonxTransport — the real watsonx.ai InferenceTransport.
 *
 * Transport-layer retries are handled here, internally.
 * The engine's semantic-stage retries happen outside this class.
 */
export class WatsonxTransport implements InferenceTransport {
  /**
   * Send a generation request to watsonx.ai with bounded transport retries.
   *
   * @param config  - Resolved provider configuration (including apiKey).
   * @param request - Generation parameters.
   * @returns Normalised generation response.
   * @throws InferenceError on all failures.
   */
  async generate(
    config: ProviderConfig,
    request: GenerationRequest,
  ): Promise<GenerationResponse> {
    // The transport expects the apiKey to be present in config.
    // It is supplied via loadProviderConfig() which reads WATSONX_API_KEY.
    const apiKey = (config as ProviderConfig & { apiKey?: string }).apiKey;
    if (!apiKey) {
      throw new InferenceError({
        code: InferenceErrorCode.MISSING_CONFIG,
        message: "Missing WATSONX_API_KEY in provider configuration.",
        retryable: false,
      });
    }

    const configWithKey = { ...config, apiKey };
    const signal = request.signal;
    let lastError: InferenceError | undefined;

    for (let attempt = 1; attempt <= MAX_TRANSPORT_RETRIES; attempt++) {
      // Abort check before every attempt
      if (signal?.aborted) {
        throw cancelledError({
          note: "Already-incurred provider cost may remain after cancellation.",
        });
      }

      try {
        return await callOnce(configWithKey, request);
      } catch (rawErr) {
        const err = rawErr instanceof InferenceError
          ? rawErr
          : classifyError(rawErr);

        lastError = err;

        // Non-retryable: propagate immediately
        if (!err.retryable || attempt >= MAX_TRANSPORT_RETRIES) {
          throw err;
        }

        // Only retry retryable transport errors on eligible status codes
        const shouldRetry =
          err.code === InferenceErrorCode.RATE_LIMITED ||
          err.code === InferenceErrorCode.PROVIDER_ERROR ||
          err.code === InferenceErrorCode.TIMEOUT ||
          (err.httpStatus !== undefined && RETRYABLE_STATUS_CODES.has(err.httpStatus));

        if (!shouldRetry) {
          throw err;
        }

        // Abort check before back-off sleep
        if (signal?.aborted) {
          throw cancelledError({
            note: "Already-incurred provider cost may remain after cancellation.",
          });
        }

        await transportSleep(attempt, signal);
      }
    }

    // Exhausted all attempts
    throw retryLimitExceededError({
      attempts: MAX_TRANSPORT_RETRIES,
      lastCode: lastError?.code ?? InferenceErrorCode.PROVIDER_ERROR,
      requestId: lastError?.requestId,
    });
  }
}

/**
 * Singleton-style factory that returns a shared WatsonxTransport instance.
 * Callers that need strict isolation should construct WatsonxTransport directly.
 */
export function createWatsonxTransport(): WatsonxTransport {
  return new WatsonxTransport();
}
