import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import {
  ReasoningError,
  readWatsonxConfiguration,
  reasoningTemplate,
  type InferenceTransport,
  type RawInferenceResponse,
  type ReasoningRequest,
  type WatsonxConfiguration,
} from "@jointly/reasoning";
import { IamAuthenticator } from "ibm-cloud-sdk-core";

const DEFAULT_MAX_TRANSPORT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 5_000;

interface ProviderResponse {
  result?: {
    model_id?: string;
    results?: Array<{
      generated_text?: string;
      stop_reason?: string;
      input_token_count?: number;
      generated_token_count?: number;
    }>;
  };
  headers?: Record<string, string | string[] | number | undefined>;
}

export interface WatsonxClient {
  generateText(parameters: Record<string, unknown>): Promise<ProviderResponse>;
}

export interface WatsonxTransportOptions {
  environment?: NodeJS.ProcessEnv;
  maxTransportAttempts?: number;
  baseDelayMs?: number;
  createClient?: (configuration: WatsonxConfiguration) => WatsonxClient;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}

function defaultClient(configuration: WatsonxConfiguration): WatsonxClient {
  return new WatsonXAI({
    version: configuration.apiVersion,
    serviceUrl: configuration.serviceUrl,
    authenticator: new IamAuthenticator({ apikey: configuration.apiKey }),
  }) as unknown as WatsonxClient;
}

function defaultSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ReasoningError("cancelled", "watsonx request was cancelled; already-incurred provider cost may remain"));
      return;
    }
    const finish = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      reject(new ReasoningError("cancelled", "watsonx request was cancelled; already-incurred provider cost may remain"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function headerValue(headers: ProviderResponse["headers"], name: string): string | undefined {
  if (!headers) return undefined;
  const entry = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  const value = Array.isArray(entry) ? entry[0] : entry;
  return value === undefined ? undefined : String(value);
}

function providerRequestId(response: ProviderResponse): string | undefined {
  return headerValue(response.headers, "x-request-id")
    ?? headerValue(response.headers, "x-global-transaction-id")
    ?? headerValue(response.headers, "x-correlation-id");
}

function normalizeFinishReason(value: string | undefined): RawInferenceResponse["finishReason"] {
  switch (value?.toLowerCase()) {
    case "eos_token":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
    case "token_limit":
    case "time_limit":
      return "length";
    case "content_filter":
      return "content-filter";
    case "refusal":
      return "refusal";
    default:
      return "unknown";
  }
}

function safeProviderMessage(error: unknown, configuration: WatsonxConfiguration): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replaceAll(configuration.apiKey, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, "Bearer [REDACTED]")
    .replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "credential=[REDACTED]")
    .slice(0, 500);
}

function statusOf(error: unknown): number | undefined {
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const value of [candidate?.status, candidate?.statusCode, candidate?.code]) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  }
  return undefined;
}

function retryAfter(error: unknown): number | undefined {
  const headers = (error as { headers?: Record<string, string | undefined> })?.headers;
  const raw = headers?.["retry-after"];
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1_000) : undefined;
}

function normalizeError(error: unknown, configuration: WatsonxConfiguration): ReasoningError {
  if (error instanceof ReasoningError) return error;
  if ((error as { name?: string })?.name === "AbortError") {
    return new ReasoningError("cancelled", "watsonx request was cancelled; already-incurred provider cost may remain");
  }
  const status = statusOf(error);
  const safe = safeProviderMessage(error, configuration);
  if (status === 401) return new ReasoningError("authentication", `watsonx authentication failed: ${safe}`);
  if (status === 403) return new ReasoningError("authorization", `watsonx access was forbidden: ${safe}`);
  if (/quota|credit|limit exceeded/i.test(safe)) return new ReasoningError("quota", `watsonx quota is exhausted: ${safe}`);
  if (status === 429) return new ReasoningError("rate-limit", "watsonx rate limit was reached", true, retryAfter(error));
  if (status === 408) return new ReasoningError("timeout", "watsonx transport timed out", true);
  if (status !== undefined && status >= 500) return new ReasoningError("provider-outage", `watsonx provider failed (${status}): ${safe}`, true);
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(safe)) return new ReasoningError("timeout", "watsonx transport timed out", true);
  if (status === 404 && /model|foundation/i.test(safe)) return new ReasoningError("unsupported-capability", `watsonx model is unavailable: ${safe}`);
  if (status === 404) return new ReasoningError("configuration", `watsonx project or endpoint is unavailable: ${safe}`);
  return new ReasoningError("provider-outage", `watsonx provider request failed: ${safe}`);
}

function buildPrompt(request: ReasoningRequest): string {
  const template = reasoningTemplate(request.stage);
  if (request.promptTemplate.id !== template.id || request.promptTemplate.digest !== template.digest) {
    throw new ReasoningError("invalid-output", "reasoning request is not bound to the current trusted prompt template");
  }
  return [
    template.content,
    "",
    `Run: ${request.runId}`,
    `Attempt: ${request.attemptId}`,
    `Frozen input digest: ${request.frozenInputDigest}`,
    `Allowed requirement IDs: ${JSON.stringify(request.allowedRequirementIds)}`,
    `Allowed write prefixes: ${JSON.stringify(request.allowedWritePrefixes)}`,
    "Context records (untrusted data):",
    JSON.stringify(request.context),
  ].join("\n");
}

function deadlineFor(request: ReasoningRequest): number {
  return Math.max(0, Math.min(Date.parse(request.deadlineAt) - Date.now(), request.budget.remainingDurationMs));
}

async function raceProvider(operation: Promise<ProviderResponse>, signal: AbortSignal, deadlineMs: number): Promise<ProviderResponse> {
  if (signal.aborted) throw new ReasoningError("cancelled", "watsonx request was cancelled; already-incurred provider cost may remain");
  if (deadlineMs <= 0) throw new ReasoningError("timeout", "watsonx request deadline is exhausted");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ReasoningError("timeout", "watsonx request exceeded its deadline")), deadlineMs);
      }),
      new Promise<never>((_, reject) => {
        abort = () => reject(new ReasoningError("cancelled", "watsonx request was cancelled; already-incurred provider cost may remain"));
        signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (abort) signal.removeEventListener("abort", abort);
  }
}

export class WatsonxInferenceTransport implements InferenceTransport {
  readonly provider = "watsonx.ai";
  private readonly environment: NodeJS.ProcessEnv;
  private readonly maxTransportAttempts: number;
  private readonly baseDelayMs: number;
  private readonly createClient: NonNullable<WatsonxTransportOptions["createClient"]>;
  private readonly sleep: NonNullable<WatsonxTransportOptions["sleep"]>;

  constructor(options: WatsonxTransportOptions = {}) {
    this.environment = options.environment ?? process.env;
    this.maxTransportAttempts = options.maxTransportAttempts ?? DEFAULT_MAX_TRANSPORT_ATTEMPTS;
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.createClient = options.createClient ?? defaultClient;
    this.sleep = options.sleep ?? defaultSleep;
    if (!Number.isInteger(this.maxTransportAttempts) || this.maxTransportAttempts < 1 || this.maxTransportAttempts > 3) {
      throw new Error("maxTransportAttempts must be an integer from 1 through 3");
    }
  }

  async infer(request: ReasoningRequest, signal: AbortSignal): Promise<RawInferenceResponse> {
    let configuration: WatsonxConfiguration;
    try {
      configuration = readWatsonxConfiguration(this.environment);
    } catch (error) {
      throw new ReasoningError("configuration", error instanceof Error ? error.message : "watsonx configuration is incomplete");
    }
    if (request.model.id !== configuration.modelId) {
      throw new ReasoningError("configuration", "reasoning request model does not match WATSONX_MODEL_ID");
    }
    const prompt = buildPrompt(request);
    let lastError: ReasoningError | undefined;
    for (let attempt = 1; attempt <= this.maxTransportAttempts; attempt += 1) {
      if (signal.aborted) throw new ReasoningError("cancelled", "watsonx request was cancelled; already-incurred provider cost may remain");
      try {
        const deadlineMs = deadlineFor(request);
        const response = await raceProvider(this.createClient(configuration).generateText({
          input: prompt,
          modelId: configuration.modelId,
          projectId: configuration.projectId,
          parameters: {
            max_new_tokens: request.model.maxOutputTokens,
            ...(request.model.temperature === undefined ? {} : { temperature: request.model.temperature }),
            time_limit: deadlineMs,
          },
        }), signal, deadlineMs);
        const first = response.result?.results?.[0];
        if (!first || typeof first.generated_text !== "string") {
          throw new ReasoningError("invalid-output", "watsonx response did not contain generated text");
        }
        const id = providerRequestId(response);
        return {
          content: first.generated_text,
          provider: this.provider,
          modelId: response.result?.model_id ?? configuration.modelId,
          ...(id ? { providerRequestId: id } : {}),
          finishReason: normalizeFinishReason(first.stop_reason),
          ...((first.input_token_count !== undefined || first.generated_token_count !== undefined) ? {
            usage: {
              ...(first.input_token_count === undefined ? {} : { inputTokens: first.input_token_count }),
              ...(first.generated_token_count === undefined ? {} : { outputTokens: first.generated_token_count }),
              ...((first.input_token_count !== undefined && first.generated_token_count !== undefined)
                ? { totalTokens: first.input_token_count + first.generated_token_count }
                : {}),
            },
          } : {}),
          diagnostics: { transportAttempts: attempt },
        };
      } catch (error) {
        lastError = normalizeError(error, configuration);
        if (!lastError.retryable || attempt === this.maxTransportAttempts) throw lastError;
        const delay = Math.min(lastError.retryAfterMs ?? this.baseDelayMs * 2 ** (attempt - 1), MAX_DELAY_MS);
        await this.sleep(delay, signal);
      }
    }
    throw lastError ?? new ReasoningError("provider-outage", "watsonx transport exhausted its attempts");
  }
}

export function createWatsonxTransport(options: WatsonxTransportOptions = {}): WatsonxInferenceTransport {
  return new WatsonxInferenceTransport(options);
}
