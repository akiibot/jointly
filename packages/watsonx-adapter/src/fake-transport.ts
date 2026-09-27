/**
 * Fake (in-process, offline) InferenceTransport.
 *
 * Used for testing without live credentials or network access.
 * The fake adapter satisfies the full InferenceTransport interface and
 * participates in the shared provider contract suite.
 *
 * Usage:
 *   const transport = new FakeTransport({ responseText: "mocked output" });
 *
 * Configurable behaviours:
 *   - Deterministic success with a supplied responseText.
 *   - Configurable error code to simulate failure scenarios.
 *   - Record of all generate() calls for assertion.
 *   - Configurable latency (default 0ms) for timing tests.
 */

import type {
  InferenceTransport,
  ProviderConfig,
  GenerationRequest,
  GenerationResponse,
} from "@jointly/reasoning";
import { InferenceError, InferenceErrorCode } from "@jointly/reasoning";

export interface FakeTransportOptions {
  /**
   * Text to return in the generated response.
   * Defaults to "fake generated output".
   */
  responseText?: string;

  /**
   * If set, generate() will throw an InferenceError with this code instead
   * of returning a response.  Use to test error-handling paths.
   */
  errorCode?: InferenceErrorCode;

  /** Custom error message when errorCode is set. */
  errorMessage?: string;

  /**
   * Whether the simulated error is retryable.
   * Defaults to false.
   */
  errorRetryable?: boolean;

  /**
   * HTTP status to attach to the simulated error (optional).
   */
  errorHttpStatus?: number;

  /**
   * Simulated latency in ms before resolving or rejecting.
   * Defaults to 0.
   */
  latencyMs?: number;

  /**
   * Simulated finish reason.  Defaults to "stop".
   */
  finishReason?: GenerationResponse["finishReason"];

  /**
   * Simulated requestId returned in responses.
   * Defaults to "fake-req-001".
   */
  requestId?: string;

  /**
   * Simulated input token count.
   * Defaults to 10.
   */
  inputTokenCount?: number;

  /**
   * Simulated generated token count.
   * Defaults to 5.
   */
  generatedTokenCount?: number;
}

export interface FakeTransportCall {
  config: ProviderConfig;
  request: GenerationRequest;
}

export class FakeTransport implements InferenceTransport {
  private readonly opts: Required<FakeTransportOptions>;
  readonly calls: FakeTransportCall[] = [];

  constructor(opts: FakeTransportOptions = {}) {
    this.opts = {
      responseText:        opts.responseText        ?? "fake generated output",
      errorCode:           opts.errorCode           ?? (null as unknown as InferenceErrorCode),
      errorMessage:        opts.errorMessage        ?? "Simulated error.",
      errorRetryable:      opts.errorRetryable      ?? false,
      errorHttpStatus:     opts.errorHttpStatus     ?? (undefined as unknown as number),
      latencyMs:           opts.latencyMs           ?? 0,
      finishReason:        opts.finishReason        ?? "stop",
      requestId:           opts.requestId           ?? "fake-req-001",
      inputTokenCount:     opts.inputTokenCount     ?? 10,
      generatedTokenCount: opts.generatedTokenCount ?? 5,
    };
  }

  async generate(
    config: ProviderConfig,
    request: GenerationRequest,
  ): Promise<GenerationResponse> {
    this.calls.push({ config, request });

    // Check abort before any async work
    if (request.signal?.aborted) {
      throw new InferenceError({
        code: InferenceErrorCode.CANCELLED,
        message: "Request cancelled before starting.",
        retryable: false,
      });
    }

    if (this.opts.latencyMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.opts.latencyMs);
        if (request.signal) {
          request.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(
                new InferenceError({
                  code: InferenceErrorCode.CANCELLED,
                  message: "Request cancelled during simulated latency.",
                  retryable: false,
                }),
              );
            },
            { once: true },
          );
        }
      });
    }

    if (this.opts.errorCode) {
      throw new InferenceError({
        code: this.opts.errorCode,
        message: this.opts.errorMessage,
        httpStatus: this.opts.errorHttpStatus || undefined,
        retryable: this.opts.errorRetryable,
      });
    }

    return {
      generatedText:       this.opts.responseText,
      finishReason:        this.opts.finishReason,
      requestId:           this.opts.requestId,
      inputTokenCount:     this.opts.inputTokenCount,
      generatedTokenCount: this.opts.generatedTokenCount,
      modelId:             config.modelId,
    };
  }
}
