# watsonx adapter contract

## Boundary

This package implements `InferenceTransport` from `@jointly/reasoning` using
IBM watsonx.ai. It accepts the shared `ReasoningRequest` and returns a
`RawInferenceResponse`; schema validation and semantic retry budgeting remain
owned by the shared reasoning core.

The transport must preserve both supported callers: the Bob IDE/MCP workflow
and the website workflow. Provider-specific code must not fork their shared
verification behavior.

## Locked provider dependencies

| Dependency | Exact version | Verified engine |
| --- | --- | --- |
| `@ibm-cloud/watsonx-ai` | `1.7.16` | `>=20.0.0` |
| `ibm-cloud-sdk-core` | `5.6.2` | `>=20` |

Jointly pins Node `22.19.x` across local setup, CI, and deployment.

## Configuration and authentication

`WATSONX_API_KEY`, `WATSONX_SERVICE_URL`, `WATSONX_PROJECT_ID`,
`WATSONX_MODEL_ID`, and `WATSONX_API_VERSION` are all required. Missing values
fail before client construction. The request model must exactly match
`WATSONX_MODEL_ID`.

The transport constructs an IBM SDK client with `IamAuthenticator`. Credentials
must remain in the authorized server process and must not be exposed to browser
code, repository code execution, Bob/MCP configuration, generated workspaces,
child environments, diagnostics, or evidence artifacts.

## Trusted prompt and response

Before provider work, the transport recomputes the trusted template for the
requested stage and verifies its ID and digest. The prompt labels repository
context as untrusted data and carries the request's allowed requirement IDs and
write prefixes.

Returned content is provider output and is not trusted until the reasoning
engine validates the stage schema. Provider request ID, model, finish reason,
and usage are recorded only when returned. Missing metadata remains absent or
`unknown`; it is never fabricated.

## Errors

| Condition | `ReasoningError.code` | Retryable here |
| --- | --- | --- |
| Missing/mismatched configuration | `configuration` | No |
| HTTP 401 | `authentication` | No |
| HTTP 403 | `authorization` | No |
| Quota/credit exhaustion | `quota` | No |
| HTTP 429 rate limit | `rate-limit` | Yes |
| HTTP 408 or SDK/network timeout | `timeout` | Yes only when the SDK call has ended |
| HTTP 5xx | `provider-outage` | Yes |
| Local deadline | `timeout` | No |
| AbortSignal | `cancelled` | No |
| Missing generated text | `invalid-output` | No |
| Model unavailable | `unsupported-capability` | No |

Diagnostic error text must redact the configured API key, bearer tokens, and
common secret/key/token assignments. The canary-secret regression test must
remain part of the offline suite.

## Retry, timeout, and cancellation

- At most three IBM SDK attempts occur per `infer` call.
- Backoff honors numeric `Retry-After`; otherwise it is exponential and capped
  at 5,000 ms.
- The reasoning engine independently bounds semantic calls. Its call limit and
  this transport-attempt limit can multiply, but neither is unbounded.
- The earlier of the request's absolute deadline and remaining duration budget
  is enforced locally and supplied as `time_limit`.
- Cancellation prevents new work and new retries.
- The IBM SDK boundary used here does not expose an HTTP abort signal for this
  call. A timed-out or cancelled provider request may remain in flight and may
  incur cost. Local deadline expiry therefore does not trigger another attempt.

## Verification gates

Routine build and tests are offline and credential-free. They must include both
the fake provider contract and the mocked watsonx provider contract.

The separately gated live test requires `JOINTLY_LIVE_WATSONX_SMOKE=1` plus all
five `WATSONX_*` variables. It is not a CI requirement and must never be marked
complete without an authorized live run and retained, secret-free evidence.

## Contribution record

Bob task `47634a6502c2e9247f90f58a10cbca05` authored the initial implementation,
preserved at snapshot commit `7b36558dd9d585a122533767e5d0942bf8fec932`.
Codex performed the compatibility port to the current reasoning API and added
the current safety/regression coverage. These are distinct contributions.
