/**
 * Provider-independent inference transport contracts for Jointly.
 *
 * These types define the boundary between the reasoning engine and any concrete
 * provider (watsonx.ai, fake, etc.).  The interface is intentionally narrow:
 * it covers only what the reasoning stages require for text generation.
 *
 * Design rules:
 * - Transport retries are the transport's responsibility and must not propagate
 *   to callers as new invocations.
 * - Semantic-stage retries are the engine's responsibility.  The two retry
 *   budgets must never multiply unexpectedly.
 * - Metadata fields that are unavailable from a provider must be represented
 *   as `undefined`, never invented.
 * - Credentials must never appear in errors, logs, diagnostics, or snapshots.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resolved provider configuration passed to each transport call.
 * Values come from environment variables (never from source files or YAML).
 */
export interface ProviderConfig {
  /** Base service URL, e.g. "https://us-south.ml.cloud.ibm.com". */
  serviceUrl: string;
  /** watsonx.ai project identifier. */
  projectId: string;
  /** Model identifier, e.g. "ibm/granite-13b-instruct-v2". */
  modelId: string;
  /**
   * API version string, e.g. "2024-03-14".
   * Required by the watsonx.ai REST API.
   */
  apiVersion: string;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * All generation parameters Jointly's reasoning stages may pass to the
 * transport.  Parameters absent from a call must be treated as absent by the
 * provider (no default injection by the transport layer).
 */
export interface GenerationRequest {
  /** The complete prompt text to generate from. */
  prompt: string;

  /** Hard upper bound on generated tokens. */
  maxNewTokens?: number;

  /**
   * Minimum tokens to generate.  Prevents premature stop on short
   * deterministic prompts.
   */
  minNewTokens?: number;

  /**
   * Sampling temperature.  Absent means provider default.
   * 0 = greedy (deterministic); higher = more random.
   */
  temperature?: number;

  /**
   * Top-P nucleus sampling cutoff.  Absent means provider default.
   */
  topP?: number;

  /**
   * Repetition penalty.  Absent means provider default.
   */
  repetitionPenalty?: number;

  /**
   * Sequences whose generation triggers a stop.  Provider semantics apply.
   */
  stopSequences?: string[];

  /**
   * Wall-clock deadline for the entire transport round-trip.
   * The transport must not allow the call to proceed past this deadline.
   */
  deadlineMs?: number;

  /**
   * Caller-supplied AbortSignal.  When signalled, the transport must cancel
   * any in-flight request and reject the returned Promise with
   * `InferenceErrorCode.CANCELLED`.
   *
   * Aborting does NOT guarantee that provider-side processing has stopped or
   * that incurred tokens are not billed.
   */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/**
 * Normalised finish reasons across providers.
 * The transport maps provider-specific values to this set.
 */
export type FinishReason =
  | "stop"        // natural end-of-sequence or stop_sequence matched
  | "length"      // max_tokens or token_limit reached
  | "time_limit"  // provider time limit reached
  | "cancelled"   // request cancelled by caller
  | "error"       // provider signalled an error inside the response body
  | "unknown";    // any other provider value — do not invent a specific reason

/**
 * Response from a successful transport call.
 *
 * Fields that the provider does not supply must be `undefined`.
 * The transport must never invent token counts, request IDs, cost, or
 * finish reasons that were not explicitly returned by the provider.
 */
export interface GenerationResponse {
  /** The generated text. */
  generatedText: string;

  /**
   * Normalised finish reason.
   * `undefined` only when the provider returns no finish-reason information
   * at all.
   */
  finishReason?: FinishReason;

  /**
   * Provider-assigned request identifier, verbatim from the response.
   * `undefined` when not supplied by the provider.
   */
  requestId?: string;

  /**
   * Number of tokens consumed by the prompt.
   * `undefined` when not returned by the provider.
   */
  inputTokenCount?: number;

  /**
   * Number of tokens generated.
   * `undefined` when not returned by the provider.
   */
  generatedTokenCount?: number;

  /**
   * Model identifier echoed by the provider, verbatim.
   * `undefined` when not returned.
   */
  modelId?: string;
}

// ---------------------------------------------------------------------------
// Transport interface
// ---------------------------------------------------------------------------

/**
 * Provider-independent transport contract.
 *
 * Implementations must:
 * 1. Perform IAM or equivalent authentication server-side.
 * 2. Map `GenerationRequest` fields to the provider's request schema.
 * 3. Enforce `deadlineMs` and respect the `signal`.
 * 4. Apply globally bounded transport retries internally.
 * 5. Map all provider errors to typed `InferenceError` instances.
 * 6. Never expose credentials in errors, logs, or diagnostics.
 *
 * Implementations must NOT:
 * - Apply semantic-stage retries (those belong to the engine).
 * - Fall back to another provider silently.
 * - Execute any provider-generated output.
 */
export interface InferenceTransport {
  /**
   * Send a single generation request to the provider.
   *
   * Resolves with the normalised response on success.
   * Rejects with `InferenceError` on any failure.
   *
   * The promise must reject promptly (not hang) when the caller's
   * AbortSignal fires or the deadline expires.
   *
   * @param config - Resolved provider configuration.
   * @param request - Generation parameters.
   * @returns Promise that resolves with the generation result.
   */
  generate(
    config: ProviderConfig,
    request: GenerationRequest,
  ): Promise<GenerationResponse>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Typed error codes for all normalised failure modes.
 */
export const enum InferenceErrorCode {
  // Configuration
  MISSING_CONFIG       = "MISSING_CONFIG",
  INVALID_PROJECT      = "INVALID_PROJECT",
  UNAVAILABLE_MODEL    = "UNAVAILABLE_MODEL",
  UNSUPPORTED_CAPABILITY = "UNSUPPORTED_CAPABILITY",

  // Authentication / authorisation
  AUTH_FAILED          = "AUTH_FAILED",        // HTTP 401
  FORBIDDEN            = "FORBIDDEN",          // HTTP 403

  // Rate / quota
  RATE_LIMITED         = "RATE_LIMITED",       // HTTP 429
  QUOTA_EXHAUSTED      = "QUOTA_EXHAUSTED",

  // Provider errors
  PROVIDER_ERROR       = "PROVIDER_ERROR",     // retryable 5xx
  TIMEOUT              = "TIMEOUT",
  CANCELLED            = "CANCELLED",

  // Response quality
  MALFORMED_RESPONSE   = "MALFORMED_RESPONSE",
  TRUNCATED_RESPONSE   = "TRUNCATED_RESPONSE",
  SCHEMA_INVALID       = "SCHEMA_INVALID",

  // Retry budget
  RETRY_LIMIT_EXCEEDED = "RETRY_LIMIT_EXCEEDED",
}

/**
 * Structured inference error.  Always safe to log: credentials are redacted
 * before the message and diagnostics fields are populated.
 */
export class InferenceError extends Error {
  readonly code: InferenceErrorCode;

  /**
   * The HTTP status code returned by the provider, if applicable.
   * `undefined` for non-HTTP errors (timeout, cancellation, config).
   */
  readonly httpStatus?: number;

  /**
   * Provider-supplied request identifier at the time of failure.
   * `undefined` if the provider did not supply one.
   */
  readonly requestId?: string;

  /**
   * Sanitized diagnostics safe to include in logs and snapshots.
   * Must not contain API keys, bearer tokens, or sensitive content.
   */
  readonly diagnostics?: Record<string, unknown>;

  /**
   * Whether the operation may be retried.
   * The transport handles transport-layer retries internally; this flag
   * is for the engine's semantic-stage retry logic.
   */
  readonly retryable: boolean;

  constructor(opts: {
    code: InferenceErrorCode;
    message: string;
    httpStatus?: number;
    requestId?: string;
    diagnostics?: Record<string, unknown>;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = "InferenceError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.requestId = opts.requestId;
    this.diagnostics = opts.diagnostics;
    this.retryable = opts.retryable ?? false;
    if (opts.cause !== undefined) {
      // Node 16.9+ supports cause natively; assign defensively for older runtimes
      (this as { cause?: unknown }).cause = opts.cause;
    }
  }
}
