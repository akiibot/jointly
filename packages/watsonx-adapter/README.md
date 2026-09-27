# @jointly/watsonx-adapter

IBM watsonx.ai transport adapter for the Jointly reasoning engine.

Implements the provider-independent `InferenceTransport` interface from
[`@jointly/reasoning`](../reasoning) for real IBM watsonx.ai inference.

---

## Selected IBM SDK

| Field             | Value                             |
|-------------------|-----------------------------------|
| **Package**       | `@ibm-cloud/watsonx-ai`           |
| **Exact version** | `1.7.16`                          |
| **npm**           | `npm install @ibm-cloud/watsonx-ai@1.7.16` |
| **Node compat**   | `>=20` (engine requirement); tested on **22.19.x** (CI) and **24.12.x** (dev) |
| **License**       | Apache-2.0                        |

The SDK provides:
- IAM authentication via `IamAuthenticator` from `ibm-cloud-sdk-core`.
- TypeScript-typed `WatsonXAI.generateText()` with `TextGenResponse`.
- ESM + CommonJS dual exports.

---

## Configuration variables

All configuration is read **exclusively from environment variables**.
No credentials may appear in source files, YAML, command arguments, or logs.

| Variable              | Required | Default        | Description                                 |
|-----------------------|----------|----------------|---------------------------------------------|
| `WATSONX_API_KEY`     | **Yes**  | —              | IBM Cloud IAM API key                       |
| `WATSONX_SERVICE_URL` | **Yes**  | —              | Base URL, e.g. `https://us-south.ml.cloud.ibm.com` |
| `WATSONX_PROJECT_ID`  | **Yes**  | —              | watsonx.ai project identifier               |
| `WATSONX_MODEL_ID`    | **Yes**  | —              | Foundation model identifier                 |
| `WATSONX_API_VERSION` | No       | `2024-03-14`   | watsonx.ai REST API version string          |

---

## Authentication behavior

IAM authentication is performed by `IamAuthenticator` from `ibm-cloud-sdk-core`.
The API key is passed to the authenticator at call time and never cached in a
form accessible outside the SDK.

Rules:
- The API key never appears in error messages, diagnostics, logs, test
  snapshots, request URLs, or child-process environments.
- `WatsonXAI` clients are constructed fresh per call (not cached globally).
- Token refresh is handled internally by the SDK's `IamTokenManager`.

---

## Timeout and cancellation behavior

- `GenerationRequest.deadlineMs` is forwarded to the SDK as the `time_limit`
  parameter (provider-enforced deadline, milliseconds).
- The adapter additionally wraps the SDK call in a `Promise.race` against a
  local timer so that `TIMEOUT` is thrown immediately when the deadline
  expires even if the SDK call does not resolve.
- When `GenerationRequest.signal` (AbortSignal) fires:
  - New work is prevented immediately.
  - The in-flight HTTP connection may not be cancelled at the OS level.
  - **Already-incurred provider token cost may remain.**
  - The adapter throws `InferenceError(CANCELLED)`.

---

## Retry policy

Transport-level retries are bounded to **3 total attempts** (1 initial + 2
retries).  Only retryable HTTP status codes (429, 500–599) or explicit
`RATE_LIMITED`/`TIMEOUT` errors trigger a retry.  Non-retryable errors
(401, 403, 404, etc.) propagate immediately.

Semantic-stage retries are owned by `@jointly/reasoning`'s `runWithRetry()`.
The two budgets are strictly separate:

> If the engine allows `maxStageAttempts = 3` and each transport call allows
> 3 attempts, the total SDK calls are at most `3 × 3 = 9`.  This is the
> **maximum** multiplication possible, and it is explicit and bounded.

Back-off uses exponential delay with 20% jitter, capped at 5 000 ms.

---

## Normalised error behavior

| Provider condition                  | `InferenceErrorCode`          | Retryable |
|-------------------------------------|-------------------------------|-----------|
| Missing env var                     | `MISSING_CONFIG`              | No        |
| HTTP 401                            | `AUTH_FAILED`                 | No        |
| HTTP 403                            | `FORBIDDEN`                   | No        |
| HTTP 404 (project/space not found)  | `INVALID_PROJECT`             | No        |
| HTTP 404 (model not found)          | `UNAVAILABLE_MODEL`           | No        |
| HTTP 429                            | `RATE_LIMITED`                | Yes       |
| Quota error in response body        | `QUOTA_EXHAUSTED`             | No        |
| HTTP 500–599                        | `PROVIDER_ERROR`              | Yes       |
| Deadline expired                    | `TIMEOUT`                     | Yes       |
| AbortSignal fired                   | `CANCELLED`                   | No        |
| Empty results array                 | `TRUNCATED_RESPONSE`          | Yes       |
| Missing `generated_text`            | `MALFORMED_RESPONSE`          | No        |
| Stage payload schema failure        | `SCHEMA_INVALID`              | No        |
| Retry budget exceeded               | `RETRY_LIMIT_EXCEEDED`        | No        |

All error messages and diagnostics are sanitised through `safeDiagnostics()`
before being stored.  Credential-shaped values are redacted to `[REDACTED]`.

---

## Metadata limitations

The following fields in `GenerationResponse` are populated **only** when the
provider supplies them.  They are `undefined` otherwise — never invented.

| Field                  | Provider source                         |
|------------------------|-----------------------------------------|
| `requestId`            | `x-request-id` or `x-global-transaction-id` response header |
| `inputTokenCount`      | `results[0].input_token_count`          |
| `generatedTokenCount`  | `results[0].generated_token_count`      |
| `modelId`              | `result.model_id`                       |
| `finishReason`         | `results[0].stop_reason` (normalised)   |

**Known limitation:** IBM watsonx.ai does not always include token-count
metadata in the response for all model variants and API versions.  When absent,
the fields are `undefined`.

---

## Security boundaries

1. **Credentials stay server-side.**  The API key is held by `IamAuthenticator`
   and never serialised into logs, error messages, or test snapshots.
2. **`safeDiagnostics()` redacts** any key whose name matches
   `key|secret|token|password|bearer|credential`.
3. **Bearer tokens** are stripped from diagnostic strings with a regex.
4. **Child processes** spawned by the Jointly runner do not inherit
   `WATSONX_API_KEY` or other credential-named environment variables.
5. **Test snapshots** must not contain live credentials; the fake adapter
   and mocked SDK ensure offline-only test execution.

---

## Separately gated live smoke test

A live smoke test exists in [`tests/live-smoke.test.ts`](tests/live-smoke.test.ts)
and is **skipped by default**.

To run it (requires live credentials and network):

```sh
# Set all five env vars in your shell — never in a .env file or script
export WATSONX_API_KEY=<your key>
export WATSONX_SERVICE_URL=https://us-south.ml.cloud.ibm.com
export WATSONX_PROJECT_ID=<your project>
export WATSONX_MODEL_ID=ibm/granite-13b-instruct-v2

JOINTLY_LIVE_SMOKE=1 npm test --workspace=packages/watsonx-adapter -- --run live-smoke
```

This test **will incur real provider cost**.  Do not run it in CI.

---

## Routine build and test

The following must pass offline without credentials:

```sh
npm run build --workspace=packages/watsonx-adapter
npm test     --workspace=packages/watsonx-adapter
```

No network requests are made during the standard test run.
