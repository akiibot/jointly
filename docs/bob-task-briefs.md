# Jointly reserved IBM Bob IDE task briefs

These tasks are intentionally reserved for the participating developer to perform in IBM Bob IDE. They are not completed by preparing this document. Preserve the Bob task-session summaries, resulting diffs/commits, test output, findings, and limitations. Never paste credentials into Bob chat, source files, screenshots, or committed logs.

## B1 — Implement the real watsonx.ai adapter

### Start gate

**Ready for participant implementation.** The repository contains the provider-independent reasoning request/result interfaces, stage schemas, fake transport, configuration contract, redaction rules, and reasoning contract tests described by W5. Read `packages/watsonx-adapter/CONTRACT.md`, record the starting commit, and confirm the baseline build/tests pass before editing. This readiness statement is not evidence that B1 has started or completed.

### Relevant files

- `packages/watsonx-adapter/README.md` and `packages/watsonx-adapter/CONTRACT.md` — reserved package and exact boundary.
- `packages/reasoning/src/contracts.ts` — `InferenceTransport`, requests, results, stages, usage, and finish reasons.
- `packages/reasoning/src/engine.ts` and `errors.ts` — validation, budgets, cancellation, and normalized errors.
- `packages/reasoning/src/provider-config.ts` — supported server-side configuration aliases.
- `packages/reasoning/src/context.ts` and `templates.ts` — redaction and trusted prompt constraints.
- `packages/reasoning/tests/reasoning.test.ts` — current provider-independent behavior to preserve and extend with shared adapter contracts.
- Root `package.json`, `package-lock.json`, `.nvmrc`, and `.node-version` — Node 22.19.x compatibility constraint.

### Prompt to use in Bob IDE

> Work in the Jointly repository and implement only Bob Task B1: the real watsonx.ai transport adapter. Before editing, read `AGENTS.md`, `docs/improvement-implementation-plan.md`, `docs/implementation-inventory.md`, `docs/bob-task-briefs.md`, `packages/watsonx-adapter/CONTRACT.md`, and every relevant file listed in the B1 brief. Record the starting commit and baseline build/test result. Verify the current official IBM watsonx.ai Node SDK and documented REST interface against Node 22.19.x, then choose the smallest supported option that provides the required IAM authentication, deadlines/cancellation, response metadata, and testable boundary; record the chosen SDK/API and exact version. The repository has not preselected that dependency. Implement `InferenceTransport` without changing deterministic verdict rules, weakening schemas, exposing arbitrary tools, adding a provider fallback, or executing provider output directly. Keep authentication server-side, map Jointly's documented environment aliases explicitly, and never log keys, bearer tokens, or credential values. Implement bounded transport retries separately from semantic retries, deadlines and cancellation, normalized auth/quota/rate-limit/timeout/provider errors, finish reason, request ID when available, usage when available, and sanitized diagnostics. Validate every returned payload through the existing reasoning engine/stage schemas. Preserve the fake adapter and add a shared contract suite that both fake and mocked real transports satisfy without a live credential or network request. Add focused tests for retry classification, global attempt bounds, abort behavior, malformed/truncated responses, missing metadata, configuration mapping, and secret redaction. Do not run a paid/live request until I separately authorize it and provide credentials through environment variables. If the provider API conflicts with a shared contract, document the conflict and ask for review instead of silently changing the contract. Finish by running the focused tests, full build, and full test suite, then report files changed, design choices, selected provider version, exact test results, remaining live-validation steps, and limitations. Update `docs/bob-development-evidence.md` only with authentic session details and the resulting diff/commit; do not claim earlier work as Bob-authored.

### Expected deliverables

- Real transport implementation under the prepared `@jointly/watsonx-adapter` package.
- Package metadata, TypeScript exports, and explicit mapping from Jointly configuration to the selected supported SDK/API and exact version.
- Auth, timeout, cancellation, bounded retry, rate-limit/quota, malformed-response, usage, and provider-request-ID handling.
- No secrets in source, arguments, logs, artifacts, diagnostics, or test snapshots.
- Focused unit/contract tests using fakes or mocked HTTP/SDK boundaries.
- Bob task-session summary screenshot and contribution record linking the task to the resulting diff/commit.
- A separate live-smoke-test procedure. A successful mock suite must not be reported as live watsonx verification.

### Acceptance tests

1. The fake and real adapters satisfy the same provider-independent contract suite.
2. Missing/wrong project, unavailable model, 401/403, 429, retryable 5xx, timeout, and cancellation map to distinct sanitized error codes.
3. Retry totals are bounded globally and transport retry does not multiply semantic retry limits.
4. Aborting a request prevents new work and reports that already-incurred provider cost may remain.
5. Truncated JSON, unknown operations, stale hashes, invalid paths, and schema-invalid payloads never advance a stage.
6. Provider request IDs and token usage are recorded only when supplied; missing values remain unavailable rather than invented.
7. Canary credentials do not appear in thrown errors, logs, snapshots, request URLs, or repository-child environments.
8. Routine `npm test` and `npm run build` pass without a live credential or paid call.
9. Live smoke validation remains unchecked until separately authorized and actually run against the intended account/model/region.

## B2 — Shared-workflow integration review and substantive debugging

### Start gate

Begin after both supported paths are wired to the shared deterministic core:

- Bob IDE + MCP investigation.
- Website + watsonx reasoning path, with fake-backed tests and the B1 adapter present.

At least one complete fixture run should be reproducible without paid inference. The participant should have a clean baseline test result and a recorded candidate commit.

### Prompt to use in Bob IDE

> Perform a substantive integration review and debugging pass for Jointly. Read `AGENTS.md`, the Revision 5 improvement plan and inventory, the shared core schemas/services, MCP tools, local/hosted orchestrator, runner environment policy, dashboard import/live paths, and publication gates. Exercise both the Bob IDE + MCP workflow and the website workflow against equivalent fixture inputs. Focus on security and evidence failures rather than styling: unknown runner exits, structured test-report classification, zero/skipped tests, credential canary leakage through environment/files/process arguments/sockets, stale source/test/config hashes, before/after generated-test preservation, requirement-resolution invalidation, compatible-pair verdicts, cross-user/run/artifact authorization, cancellation/restart behavior, and stale or duplicate publication. Identify concrete findings with reproduction steps and severity. Implement or direct substantive fixes for confirmed findings without weakening tests or changing expected intent to fit the demo. Add regression tests that fail before each fix and pass afterward. Verify both workflows still produce the same canonical evidence and verdict for equivalent inputs. Do not use mocks as proof of live watsonx, GitHub publication, deployment, or Bob evidence. Finish with a review report listing inspected areas, findings, fixes/diffs, test commands/results, remaining risks, and any external validation still required.

### Expected deliverables

- A written review report with concrete findings, severity, reproduction, disposition, and residual risk.
- At least one meaningful integration/security finding investigated deeply; if no bug is confirmed, provide the executed adversarial matrix and evidence rather than a generic approval.
- Fixes or precise follow-up patches for confirmed issues, with regression tests.
- Cross-workflow equivalence evidence for canonical executions, evidence gates, and passport verdicts.
- Bob task-session summary screenshot and contribution record linked to resulting diffs/commits.

### Acceptance tests

1. Exit 127, malformed/missing report, timeout/signal, syntax/import/setup error, zero tests, and assertion failure remain distinctly classified in both workflows.
2. A parent canary environment secret and backend-only canary file are unavailable to repository code; control-plane sockets/metadata routes are unreachable under the selected profile.
3. Equivalent MCP and website fixture runs produce schema-valid canonical records and the same scoped verdict.
4. A changed source ref, generated test, accepted requirement resolution, verification policy, or repair invalidates dependent evidence.
5. Pre-repair collision evidence and the exact confirmed regression test survive post-repair execution unchanged.
6. Unauthorized identities cannot access another run, event stream, artifact, resolution, candidate, or publication route—including in the single-operator H1 release.
7. Cancellation/restart cannot create late success, reset budgets, or publish twice.
8. Publication approval is bound to the exact candidate and current source/target revisions.
9. Full build and automated tests pass; live/provider/deployment/submission checks remain explicitly pending unless actually performed.

## Evidence record template

```text
Bob task: B1 or B2
Participant:
Date/time and timezone:
Bob workspace/task ID:
Session-summary screenshot:
Starting commit:
Resulting commit or diff:
Files substantially authored/reviewed by Bob:
Concrete findings:
Tests executed and results:
Live checks executed (or "none"):
Remaining limitations:
```
