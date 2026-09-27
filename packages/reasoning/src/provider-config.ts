/**
 * Provider configuration loader.
 *
 * Reads exclusively from environment variables using Jointly's documented
 * environment aliases.  Never reads from files, YAML, or command arguments.
 *
 * Variables:
 *   WATSONX_API_KEY        — IAM API key (never logged or included in errors)
 *   WATSONX_SERVICE_URL    — Base service URL
 *   WATSONX_PROJECT_ID     — Project identifier
 *   WATSONX_MODEL_ID       — Model identifier
 *   WATSONX_API_VERSION    — API version string (default: "2024-03-14")
 */

import {
  type ProviderConfig,
  InferenceError,
  InferenceErrorCode,
} from "./contracts.js";

const DEFAULT_API_VERSION = "2024-03-14";

/**
 * Alias names that map to Jointly's documented environment variables.
 * Expand here to support additional aliases without changing callers.
 */
const ENV_ALIASES = {
  apiKey:     ["WATSONX_API_KEY"],
  serviceUrl: ["WATSONX_SERVICE_URL"],
  projectId:  ["WATSONX_PROJECT_ID"],
  modelId:    ["WATSONX_MODEL_ID"],
  apiVersion: ["WATSONX_API_VERSION"],
} as const;

function readEnv(aliases: readonly string[]): string | undefined {
  for (const name of aliases) {
    const val = process.env[name];
    if (val !== undefined && val.length > 0) return val;
  }
  return undefined;
}

export interface ProviderConfigWithKey extends ProviderConfig {
  /** IAM API key — keep server-side, never log or include in errors. */
  apiKey: string;
}

/**
 * Read and validate provider configuration from environment variables.
 *
 * Throws `InferenceError(MISSING_CONFIG)` for any missing required variable.
 * The error message names the missing variable but never reveals its value.
 */
export function loadProviderConfig(): ProviderConfigWithKey {
  const apiKey     = readEnv(ENV_ALIASES.apiKey);
  const serviceUrl = readEnv(ENV_ALIASES.serviceUrl);
  const projectId  = readEnv(ENV_ALIASES.projectId);
  const modelId    = readEnv(ENV_ALIASES.modelId);
  const apiVersion = readEnv(ENV_ALIASES.apiVersion) ?? DEFAULT_API_VERSION;

  const missing: string[] = [];
  if (!apiKey)     missing.push(ENV_ALIASES.apiKey[0]);
  if (!serviceUrl) missing.push(ENV_ALIASES.serviceUrl[0]);
  if (!projectId)  missing.push(ENV_ALIASES.projectId[0]);
  if (!modelId)    missing.push(ENV_ALIASES.modelId[0]);

  if (missing.length > 0) {
    throw new InferenceError({
      code: InferenceErrorCode.MISSING_CONFIG,
      message: `Missing required environment variable(s): ${missing.join(", ")}`,
      retryable: false,
    });
  }

  return {
    apiKey:     apiKey!,
    serviceUrl: serviceUrl!,
    projectId:  projectId!,
    modelId:    modelId!,
    apiVersion,
  };
}

/**
 * Validate a pre-loaded ProviderConfigWithKey for completeness.
 * Throws `InferenceError(MISSING_CONFIG)` for any empty required field.
 */
export function validateProviderConfig(
  config: Partial<ProviderConfigWithKey>,
): asserts config is ProviderConfigWithKey {
  const required: Array<keyof ProviderConfigWithKey> = [
    "apiKey",
    "serviceUrl",
    "projectId",
    "modelId",
    "apiVersion",
  ];
  const missing = required.filter(
    (k) => !(config as Record<string, unknown>)[k],
  );
  if (missing.length > 0) {
    throw new InferenceError({
      code: InferenceErrorCode.MISSING_CONFIG,
      message: `Missing required config field(s): ${missing.join(", ")}`,
      retryable: false,
    });
  }
}
