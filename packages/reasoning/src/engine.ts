/**
 * Reasoning engine — semantic-stage retry loop.
 *
 * The engine owns semantic-stage retries.  Transport-layer retries are owned
 * by the transport (InferenceTransport implementation) and must not be visible
 * here.  The two retry budgets must never multiply unexpectedly.
 *
 * Invariants:
 * - At most `maxStageAttempts` calls to transport.generate() per engine call.
 * - Retries only on retryable InferenceErrors.
 * - Non-retryable errors propagate immediately.
 * - AbortSignal cancellation prevents new attempts immediately.
 */

import type { InferenceTransport, GenerationRequest, GenerationResponse, ProviderConfig } from "./contracts.js";
import { InferenceError, InferenceErrorCode } from "./contracts.js";
import { cancelledError } from "./errors.js";

/**
 * Bounded exponential back-off configuration for semantic-stage retries.
 */
export interface EngineRetryConfig {
  /** Maximum number of attempts (initial + retries). Minimum 1. */
  maxStageAttempts: number;
  /** Base delay in ms before the first retry. */
  baseDelayMs: number;
  /** Maximum delay cap in ms. */
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: EngineRetryConfig = {
  maxStageAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(cancelledError());
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Run a single generation through the transport with semantic-stage retries.
 *
 * @param transport - The InferenceTransport implementation to call.
 * @param config    - Resolved provider configuration.
 * @param request   - Generation parameters.
 * @param retryConfig - Retry policy (defaults to 3 attempts).
 * @returns Resolved generation response.
 * @throws InferenceError on all failures.
 */
export async function runWithRetry(
  transport: InferenceTransport,
  config: ProviderConfig,
  request: GenerationRequest,
  retryConfig: EngineRetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<GenerationResponse> {
  const { maxStageAttempts, baseDelayMs, maxDelayMs } = retryConfig;
  const signal = request.signal;

  let lastError: InferenceError | undefined;

  for (let attempt = 1; attempt <= maxStageAttempts; attempt++) {
    // Abort check before starting a new attempt
    if (signal?.aborted) {
      throw cancelledError({ note: "Already-incurred provider cost may remain after cancellation." });
    }

    try {
      return await transport.generate(config, request);
    } catch (err) {
      if (err instanceof InferenceError) {
        lastError = err;
        // Propagate non-retryable errors immediately
        if (!err.retryable || attempt >= maxStageAttempts) {
          throw err;
        }
        // Abort check before waiting
        if (signal?.aborted) {
          throw cancelledError({ note: "Already-incurred provider cost may remain after cancellation." });
        }
        // Exponential back-off with jitter
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        const jitter = Math.random() * delay * 0.2;
        await sleep(Math.round(delay + jitter), signal);
      } else {
        // Unexpected (non-InferenceError) — wrap and propagate
        throw new InferenceError({
          code: InferenceErrorCode.PROVIDER_ERROR,
          message: err instanceof Error ? err.message : String(err),
          retryable: false,
          cause: err,
        });
      }
    }
  }

  // Should never reach here, but TypeScript requires a return path
  throw lastError ?? new InferenceError({
    code: InferenceErrorCode.PROVIDER_ERROR,
    message: "Unexpected end of retry loop.",
    retryable: false,
  });
}
