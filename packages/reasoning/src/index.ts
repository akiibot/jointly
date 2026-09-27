/**
 * @jointly/reasoning — public API
 *
 * Re-exports the provider-independent inference transport contract,
 * the reasoning engine, error factories, stage validators, and context helpers.
 */

// Core contracts
export type {
  ProviderConfig,
  GenerationRequest,
  GenerationResponse,
  FinishReason,
  InferenceTransport,
} from "./contracts.js";
export { InferenceError, InferenceErrorCode } from "./contracts.js";

// Provider configuration loader
export type { ProviderConfigWithKey } from "./provider-config.js";
export { loadProviderConfig, validateProviderConfig } from "./provider-config.js";

// Error factories and sanitization helpers
export {
  redact,
  safeDiagnostics,
  missingConfigError,
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
  schemaInvalidError,
  retryLimitExceededError,
  unsupportedCapabilityError,
} from "./errors.js";

// Reasoning engine
export type { EngineRetryConfig } from "./engine.js";
export { runWithRetry } from "./engine.js";

// Stage payload validation
export type { StagePayload } from "./templates.js";
export { parseStagePayload, assertStageId } from "./templates.js";

// Context helpers
export type { ReasoningContext } from "./context.js";
export { withSignal, withDeadline, remainingDeadlineMs } from "./context.js";
