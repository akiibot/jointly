# @jointly/watsonx-adapter

Real IBM watsonx.ai inference transport for the shared Jointly reasoning core.
The website and Bob IDE/MCP workflows can use the same `InferenceTransport`
contract; the adapter does not replace either workflow.

## Runtime and SDK

- Jointly runtime: Node `22.19.x`.
- IBM SDK: `@ibm-cloud/watsonx-ai@1.7.16`.
- Authentication library: `ibm-cloud-sdk-core@5.6.2`.
- The locked IBM SDK declares Node `>=20.0.0`, so it is compatible with the
  repository's Node 22 pin.

## Required server environment

All five values are required and are read at inference time:

| Variable | Meaning |
| --- | --- |
| `WATSONX_API_KEY` | IBM Cloud IAM API key |
| `WATSONX_SERVICE_URL` | Regional watsonx.ai service URL |
| `WATSONX_PROJECT_ID` | Authorized watsonx.ai project |
| `WATSONX_MODEL_ID` | Approved foundation-model identifier |
| `WATSONX_API_VERSION` | watsonx.ai REST API version |

Keep these values in the authorized server process only. Do not place them in
the repository, Bob configuration, generated workspaces, browser code, child
process environments, command arguments, logs, or evidence artifacts.

## Contract

`WatsonxInferenceTransport.infer(request, signal)`:

- verifies the request uses the configured model;
- verifies the request is bound to the current trusted prompt template;
- treats repository context as untrusted data and includes only the shared
  request contract's context and allowlists;
- returns generated content plus provider-supplied request ID, model, finish
  reason, and token counts when available; and
- never invents provider metadata that was not returned.

Configuration, authentication, authorization, quota, rate-limit, provider
outage, timeout, cancellation, malformed-output, and unavailable-model errors
are mapped to the shared `ReasoningError` taxonomy. Error text redacts the
configured API key and common bearer/API-key forms.

Transport retries are limited to three attempts. Retryable rate-limit and
provider failures use `Retry-After` when available or bounded exponential
backoff capped at five seconds. The reasoning engine separately limits semantic
calls; these two explicit limits may multiply, so both remain bounded.

The local deadline and `AbortSignal` stop orchestration from waiting or starting
new retries. The selected SDK boundary does not expose per-call HTTP abort, so
provider-side processing already in flight can continue and may incur cost.
For that reason, a locally expired call is not retried by this transport.

## Offline verification

Standard tests inject a mocked IBM client and make no provider request:

```sh
npm run build --workspace=@jointly/watsonx-adapter
npm test --workspace=@jointly/watsonx-adapter
```

The tests cover the shared fake/real provider contract, trusted-template
binding, configuration, model consistency, metadata, retry bounds,
cancellation, deadlines, error mapping, malformed responses, and a canary
secret that must not appear in errors.

## Separately gated live smoke test

The live test is skipped unless `JOINTLY_LIVE_WATSONX_SMOKE=1` is set. It uses
real credentials, network access, and provider capacity, so it may incur cost.
It must be run only by the authorized operator and is not routine CI.

PowerShell:

```powershell
$env:JOINTLY_LIVE_WATSONX_SMOKE = "1"
npm.cmd test --workspace=@jointly/watsonx-adapter -- live-smoke.test.ts
```

macOS/Linux:

```sh
JOINTLY_LIVE_WATSONX_SMOKE=1 npm test --workspace=@jointly/watsonx-adapter -- live-smoke.test.ts
```

Set the five required `WATSONX_*` values in the same authorized process before
running the command. A passing mocked test is not evidence of live inference.

## Authorship and evidence

IBM Bob produced the initial adapter, tests, and documentation in task
`47634a6502c2e9247f90f58a10cbca05`; its preserved snapshot is commit
`7b36558dd9d585a122533767e5d0942bf8fec932` on
`bob/b1-watsonx-adapter-snapshot`. Codex ported that work to the current shared
reasoning contract, added compatibility/security checks, and performed the
offline verification recorded in `docs/bob-development-evidence.md`. No live
watsonx result is claimed here.
