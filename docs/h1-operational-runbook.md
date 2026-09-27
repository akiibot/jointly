# H1 operational runbook

This runbook defines required responses for the constrained hosted target: one authorized operator, one allowlisted synthetic public repository, one active job, and one explicitly approved integration PR. It does not assert that H1 is deployed. Provider- and infrastructure-specific commands must be added only after the actual topology is selected and validated.

## Universal stop rules

1. Activate the operator kill switch for suspected credential exposure, cross-user access, incorrect repository selection, uncontrolled spend, or repeated publication ambiguity.
2. Stop new leases and publication before diagnosing. Cancelling a browser request alone is insufficient.
3. Preserve the immutable run, attempt, event, artifact, candidate, approval, and publication records needed to explain the failure. Do not preserve credentials or unrestricted raw logs.
4. Never convert an operational failure into a collision or safe verdict. Use the typed failure category and leave verification incomplete.
5. Resume only after revalidating owner, installation, repository, frozen refs, budget, active lease/fencing token, artifact checksums, and current candidate approval.

## Bad or expired watsonx credentials

- Classify as `INFERENCE_AUTH_FAILED`; do not retry as a schema correction or switch providers.
- Redact tokens and credential values from diagnostics, events, traces, screenshots, and support bundles.
- Disable new inference, preserve deterministic artifacts already produced, and mark the active stage failed/interrupted.
- Rotate or repair the secret in the secret manager, verify region/project/model access with a separately authorized bounded smoke test, then start a fresh attempt. Do not reuse an uncertain provider response.

## Quota, rate limit, or budget exhaustion

- Stop before the aggregate call/token/time/cost ceiling is exceeded. Count failed provider calls and resumed attempts.
- Honor a provider retry delay only within the overall run deadline and B1 transport retry policy. Semantic retries remain separately bounded.
- Return `BUDGET_EXCEEDED` or the normalized quota/rate-limit category with no fake result.
- Increasing a ceiling requires an explicit operator decision and a new budget snapshot; never silently reset counters on restart.

## Stale source refs or target tip

- Mark the preview, evidence snapshot, candidate, and approval stale; preserve them as history.
- Re-fetch the two PR heads, target tip, open state, installation, user permission, and common base directly from GitHub.
- Require a new run when any bound revision changed. Do not transplant an old repair or approval onto new commits.
- If refs move during publication, record the remote result, mark it stale-after-publication, and do not claim it certifies the new target state.

## Stuck worker or lost lease

- A lease must have an expiry, heartbeat, fencing token, run/attempt owner, and maximum stage duration.
- On expiry, prevent the old worker from writing stage completion or publishing. Reconcile any completed artifact upload by checksum and ownership before accepting it.
- Kill descendants, destroy the execution environment, revoke its short-lived credentials, and start a new attempt only if policy and budget allow.
- Report queue time and stage honestly; do not invent an ETA.

## Cancellation and restart

- Persist cancellation before signalling the worker. Late success from a cancelled or fenced attempt is rejected.
- On API restart, recover durable state and leases before accepting mutations. On worker restart, reconcile ownership and mark uncertain work interrupted.
- Resume only incomplete stages after revalidating immutable inputs and completed artifact digests. Never infer success from process disappearance.

## Failed or ambiguous publication

- Publication requires current write permission, installation scope, open PRs, unchanged target/head SHAs, exact candidate digest, unused approval, and passing verification gates.
- Use the candidate digest as the idempotency identity. Before retrying an error or timeout, query for the intended branch/commit/PR and reconcile remote state.
- Never force-push an unrelated existing branch. A branch-name collision without the exact candidate identity blocks publication.
- If a branch was created but PR creation failed, retain the partial result and either complete the same publication idempotently or remove it through an explicitly authorized recovery action.
- Keep auto-merge off. Never modify, close, or merge either source PR.

## Evidence retention and deletion

Until deployed values are approved, use these as required policy fields rather than invented defaults:

- workspace expiry after terminal state;
- raw-log expiry and maximum size;
- validated-artifact/passport expiry;
- inference-context retention where controllable;
- backup scope and expiry;
- deletion grace period and legal/event evidence exceptions.

Deletion must authenticate the owner, cancel active work, revoke download links, remove workspace/object data, tombstone authoritative metadata as policy requires, and produce a deletion audit event. Backups need a documented expiry; deleting the primary object alone is not a complete deletion claim. Public sample evidence is a separate sanitized asset and must never be substituted for a deleted private run.

## Incident evidence

Record request/run/attempt IDs, timestamps, normalized error category, affected stage, current budget, lease/fencing identity, artifact checksums, operator actions, and recovery result. Exclude secrets, raw private source beyond the approved support scope, browser cookies, and unrelated tenant data.

## Release readiness

Before H1, replace every topology-dependent placeholder with tested commands and contacts, rehearse each section in staging with fake secrets, and verify that an unauthorized user or repository cannot access any run, event, artifact, decision, candidate, approval, or publication action. Webhook operations are deferred to P1; no webhook endpoint should exist until signature validation, delivery deduplication, authorization, and a durable inbox are complete.
