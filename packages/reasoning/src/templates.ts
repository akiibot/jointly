/**
 * Stage payload validation helpers.
 *
 * The reasoning engine validates every returned stage payload through these
 * schemas before acting on it.  Any payload that fails validation must be
 * rejected with InferenceError(SCHEMA_INVALID), never silently truncated
 * or coerced.
 */

import { InferenceError, InferenceErrorCode } from "./contracts.js";
import { schemaInvalidError } from "./errors.js";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

/**
 * Minimal required fields for a stage response JSON payload.
 * Extend this as the reasoning stages evolve.
 */
export interface StagePayload {
  /** Unique stage identifier, e.g. "intent-extraction". */
  stage: string;
  /** Arbitrary stage-specific content. */
  content: unknown;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Assert that `value` is a non-null object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse and validate a provider-returned string as a stage payload JSON.
 *
 * @throws InferenceError(SCHEMA_INVALID) if the string is not valid JSON or
 *   does not satisfy the StagePayload schema.
 */
export function parseStagePayload(raw: string): StagePayload {
  if (!raw || raw.trim().length === 0) {
    throw schemaInvalidError({
      details: "Stage payload is empty.",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw schemaInvalidError({
      details: `Stage payload is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  if (!isObject(parsed)) {
    throw schemaInvalidError({
      details: `Stage payload must be a JSON object, got ${typeof parsed}.`,
    });
  }

  if (typeof parsed["stage"] !== "string" || parsed["stage"].length === 0) {
    throw schemaInvalidError({
      details: 'Stage payload must have a non-empty "stage" string field.',
    });
  }

  if (!("content" in parsed)) {
    throw schemaInvalidError({
      details: 'Stage payload must have a "content" field.',
    });
  }

  return {
    stage: parsed["stage"] as string,
    content: parsed["content"],
  };
}

/**
 * Validate that `stageId` matches the expected value.
 *
 * @throws InferenceError(SCHEMA_INVALID) on mismatch.
 */
export function assertStageId(
  payload: StagePayload,
  expected: string,
): void {
  if (payload.stage !== expected) {
    throw new InferenceError({
      code: InferenceErrorCode.SCHEMA_INVALID,
      message: `Unexpected stage identifier: expected "${expected}", got "${payload.stage}".`,
      retryable: false,
    });
  }
}
