/**
 * Normalised error constructors for the reasoning engine.
 *
 * Central place that maps raw provider error information to typed
 * InferenceError instances.  All helpers redact credentials and
 * sensitive values before producing the safe message/diagnostics.
 */

import { InferenceError, InferenceErrorCode } from "./contracts.js";

/** Pattern: any value in an env var whose name ends with KEY/SECRET/TOKEN */
const SECRET_PATTERN = /\b(WATSONX_API_KEY|API_KEY|SECRET|TOKEN|BEARER|password)\s*[:=]\s*\S+/gi;

/**
 * Redact credential-shaped content from a string.
 * Also removes bare "Bearer <token>" patterns.
 */
export function redact(input: string): string {
  return input
    .replace(SECRET_PATTERN, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer [REDACTED]")
    .replace(/apikey\s*=\s*\S+/gi, "apikey=[REDACTED]");
}

/**
 * Return a sanitized diagnostics map that is safe to log.
 * Strips any key whose name suggests a credential value.
 */
export function safeDiagnostics(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const credentialKeys = /key|secret|token|password|bearer|credential/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (credentialKeys.test(k)) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "string") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Typed error factories
// ---------------------------------------------------------------------------

export function missingConfigError(missingVars: string[]): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.MISSING_CONFIG,
    message: `Missing required environment variable(s): ${missingVars.join(", ")}`,
    retryable: false,
  });
}

export function authFailedError(opts?: {
  httpStatus?: number;
  requestId?: string;
  details?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.AUTH_FAILED,
    message: "Authentication failed (HTTP 401). Check WATSONX_API_KEY.",
    httpStatus: opts?.httpStatus ?? 401,
    requestId: opts?.requestId,
    diagnostics: opts?.details
      ? safeDiagnostics({ details: opts.details })
      : undefined,
    retryable: false,
  });
}

export function forbiddenError(opts?: {
  httpStatus?: number;
  requestId?: string;
  details?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.FORBIDDEN,
    message:
      "Access forbidden (HTTP 403). Check WATSONX_PROJECT_ID and IAM permissions.",
    httpStatus: opts?.httpStatus ?? 403,
    requestId: opts?.requestId,
    diagnostics: opts?.details
      ? safeDiagnostics({ details: opts.details })
      : undefined,
    retryable: false,
  });
}

export function invalidProjectError(opts?: {
  projectId?: string;
  requestId?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.INVALID_PROJECT,
    message:
      `Invalid or inaccessible project/space (WATSONX_PROJECT_ID${
        opts?.projectId ? `: ${opts.projectId}` : ""
      }). Verify the project exists and the API key has access.`,
    requestId: opts?.requestId,
    retryable: false,
  });
}

export function unavailableModelError(opts?: {
  modelId?: string;
  requestId?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.UNAVAILABLE_MODEL,
    message:
      `Model unavailable (WATSONX_MODEL_ID${
        opts?.modelId ? `: ${opts.modelId}` : ""
      }). The model may not be available in this region or project.`,
    requestId: opts?.requestId,
    retryable: false,
  });
}

export function rateLimitedError(opts?: {
  requestId?: string;
  retryAfterMs?: number;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.RATE_LIMITED,
    message: "Rate limit exceeded (HTTP 429). Reduce request rate.",
    httpStatus: 429,
    requestId: opts?.requestId,
    diagnostics: opts?.retryAfterMs !== undefined
      ? { retryAfterMs: opts.retryAfterMs }
      : undefined,
    retryable: true,
  });
}

export function quotaExhaustedError(opts?: {
  requestId?: string;
  details?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.QUOTA_EXHAUSTED,
    message: "Provider quota exhausted. Check your plan limits.",
    requestId: opts?.requestId,
    diagnostics: opts?.details
      ? safeDiagnostics({ details: opts.details })
      : undefined,
    retryable: false,
  });
}

export function providerError(opts: {
  httpStatus: number;
  requestId?: string;
  details?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.PROVIDER_ERROR,
    message: `Provider error (HTTP ${opts.httpStatus}). This may be transient.`,
    httpStatus: opts.httpStatus,
    requestId: opts.requestId,
    diagnostics: opts.details
      ? safeDiagnostics({ details: opts.details })
      : undefined,
    retryable: opts.httpStatus >= 500,
  });
}

export function timeoutError(opts?: {
  requestId?: string;
  deadlineMs?: number;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.TIMEOUT,
    message: `Request timed out${opts?.deadlineMs ? ` after ${opts.deadlineMs}ms` : ""}.`,
    requestId: opts?.requestId,
    diagnostics: opts?.deadlineMs !== undefined
      ? { deadlineMs: opts.deadlineMs }
      : undefined,
    retryable: true,
  });
}

export function cancelledError(opts?: {
  requestId?: string;
  note?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.CANCELLED,
    message: `Request cancelled by caller.${
      opts?.note ? ` Note: ${opts.note}` : ""
    }`,
    requestId: opts?.requestId,
    retryable: false,
  });
}

export function malformedResponseError(opts: {
  details: string;
  requestId?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.MALFORMED_RESPONSE,
    message: `Malformed provider response: ${redact(opts.details)}`,
    requestId: opts.requestId,
    retryable: false,
  });
}

export function truncatedResponseError(opts?: {
  requestId?: string;
  details?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.TRUNCATED_RESPONSE,
    message: "Provider response was truncated or empty.",
    requestId: opts?.requestId,
    diagnostics: opts?.details
      ? safeDiagnostics({ details: opts.details })
      : undefined,
    retryable: true,
  });
}

export function schemaInvalidError(opts: {
  details: string;
  requestId?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.SCHEMA_INVALID,
    message: `Stage payload failed schema validation: ${redact(opts.details)}`,
    requestId: opts.requestId,
    retryable: false,
  });
}

export function retryLimitExceededError(opts: {
  attempts: number;
  lastCode: InferenceErrorCode;
  requestId?: string;
}): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.RETRY_LIMIT_EXCEEDED,
    message: `Transport retry limit exceeded after ${opts.attempts} attempt(s). Last error code: ${opts.lastCode}.`,
    requestId: opts.requestId,
    diagnostics: { attempts: opts.attempts, lastCode: opts.lastCode },
    retryable: false,
  });
}

export function unsupportedCapabilityError(capability: string): InferenceError {
  return new InferenceError({
    code: InferenceErrorCode.UNSUPPORTED_CAPABILITY,
    message: `Unsupported provider capability: "${capability}".`,
    retryable: false,
  });
}
