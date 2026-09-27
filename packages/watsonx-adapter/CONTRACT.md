# watsonx-adapter CONTRACT.md

## Purpose

Implements the provider-independent `InferenceTransport` interface from
`@jointly/reasoning` for IBM watsonx.ai.

## SDK

| Field          | Value                     |
|--------------- |---------------------------|
| SDK name       | `@ibm-cloud/watsonx-ai`   |
| Exact version  | `1.7.16`                  |
| Node engine    | `>=20`                    |
| Node tested    | 22.19.x (CI), 24.12.x (dev) |

## Authentication

IAM authentication via `IamAuthenticator` from `ibm-cloud-sdk-core`.
API key is read **only** from the `WATSONX_API_KEY` environment variable at
call time.  It is never logged, stored, included in errors, or passed through
child-process environments.

## Configuration variables

| Variable              | Required | Description                           |
|-----------------------|----------|---------------------------------------|
| `WATSONX_API_KEY`     | Yes      | IBM Cloud IAM API key                 |
| `WATSONX_SERVICE_URL` | Yes      | Base URL (e.g. `https://us-south.ml.cloud.ibm.com`) |
| `WATSONX_PROJECT_ID`  | Yes      | watsonx.ai project identifier         |
| `WATSONX_MODEL_ID`    | Yes      | Foundation model identifier           |
| `WATSONX_API_VERSION` | No       | API version; defaults to `2024-03-14` |

## Timeout and cancellation

- `GenerationRequest.deadlineMs` is forwarded as the SDK's `timeLimit`
  parameter.  The SDK does not expose per-call abort at the HTTP layer, so
  the adapter additionally wraps the SDK call with a `Promise.race` against
  a deadline timer and an `AbortSignal` listener.
- When `signal.abort()` is called, the in-flight request is abandoned.
  **Provider-side processing may have already incurred token costs.**
  The adapter rejects with `InferenceError(CANCELLED)` immediately.

## Retry policy

Transport retries are bounded globally to `MAX_TRANSPORT_RETRIES = 3`
total attempts (1 initial + 2 retries).  Only retryable HTTP status codes
(429, 500–599) trigger a retry.  Non-retryable errors (401, 403, 404, etc.)
propagate immediately without retry.

Semantic-stage retries are owned by `@jointly/reasoning`'s engine
(`runWithRetry`).  The two retry budgets are strictly separate and cannot
multiply: the engine calls `generate()` at most `maxStageAttempts` times,
and each such call allows at most `MAX_TRANSPORT_RETRIES` internal retries.

## Normalised error mapping

| Provider condition                  | `InferenceErrorCode`        |
|-------------------------------------|-----------------------------|
| Missing env var                     | `MISSING_CONFIG`            |
| HTTP 401                            | `AUTH_FAILED`               |
| HTTP 403                            | `FORBIDDEN`                 |
| HTTP 404 (project/space not found)  | `INVALID_PROJECT`           |
| HTTP 404 (model not found)          | `UNAVAILABLE_MODEL`         |
| HTTP 429                            | `RATE_LIMITED`              |
| Quota error in response body        | `QUOTA_EXHAUSTED`           |
| HTTP 500–599                        | `PROVIDER_ERROR` (retryable)|
| Deadline expired                    | `TIMEOUT`                   |
| AbortSignal fired                   | `CANCELLED`                 |
| Empty `generated_text`              | `TRUNCATED_RESPONSE`        |
| JSON parse failure                  | `MALFORMED_RESPONSE`        |
| Stage payload schema failure        | `SCHEMA_INVALID`            |
| Retry budget exceeded               | `RETRY_LIMIT_EXCEEDED`      |

## Metadata limitations

- `requestId`: taken from the provider's `x-request-id` or `X-Global-Transaction-ID`
  response header when available; `undefined` otherwise.
- `inputTokenCount` / `generatedTokenCount`: taken from the first result item's
  `input_token_count` / `generated_token_count` when returned; `undefined` otherwise.
- `modelId`: taken from `response.result.model_id`; `undefined` if absent.
- **Never invented.**  If the provider does not supply a value, the field is `undefined`.

## Security boundaries

- Credentials never appear in error messages, diagnostics, logs, test
  snapshots, request URLs, or child-process environments.
- The adapter's `buildSafeDiagnostics` helper redacts keys whose names match
  `key|secret|token|password|bearer|credential`.
- The `WatsonXAI` client instance is constructed fresh per call and is never
  cached in a way that could retain bearer tokens across test isolation
  boundaries.

## Live smoke-test procedure (separately gated)

The live smoke test is in `tests/live-smoke.test.ts` and is skipped by default.
To run it, set all five environment variables in the current process environment
and run:

```sh
JOINTLY_LIVE_SMOKE=1 npm test --workspace=packages/watsonx-adapter -- --run live-smoke
```

**Do not run this test in CI or offline environments.**  It will incur real
provider cost.  The smoke test is intentionally separated from the main test
suite and cannot pass without live credentials.

## Provider-contract conflicts

None identified at implementation time.  If a future SDK update changes the
`generateText` API, update this file and request review before modifying the
shared `InferenceTransport` contract.
