# Bob Task B1 implementation contract

This directory is reserved for the participant to implement in IBM Bob IDE. At this checkpoint it contains no real watsonx transport implementation.

## Required inputs

Read these files before editing:

- `AGENTS.md`
- `docs/improvement-implementation-plan.md`
- `docs/implementation-inventory.md`
- `docs/bob-task-briefs.md`
- `packages/reasoning/src/contracts.ts`
- `packages/reasoning/src/engine.ts`
- `packages/reasoning/src/errors.ts`
- `packages/reasoning/src/provider-config.ts`
- `packages/reasoning/src/context.ts`
- `packages/reasoning/src/templates.ts`
- `packages/reasoning/tests/reasoning.test.ts`

## Boundary

Implement an `InferenceTransport` for real watsonx.ai. Select either the current official IBM watsonx.ai Node SDK or documented REST API after verifying Node 22.19.x compatibility and the required cancellation, metadata, authentication, and response capabilities. Record the selected SDK/API and version in this package. The repository has not preselected an SDK dependency.

Do not change deterministic verdict rules, execute model output directly, inherit backend credentials into repository processes, add a provider fallback, or weaken reasoning schemas/budgets/redaction to accommodate the transport. If a shared contract is impossible or unsafe, document the mismatch and stop that portion for review.

## Expected package shape

Bob may adjust names while preserving the boundary, but the deliverable should include:

- workspace `package.json` and TypeScript configuration;
- transport implementation and public export;
- configuration-to-provider request mapping;
- normalized, sanitized provider error mapping;
- focused mocked unit/contract tests that require no live credential;
- README containing configuration names, selected SDK/API version, limitations, and a separately gated live smoke procedure.

## Acceptance

The authoritative prompt, deliverables, and nine acceptance checks are in `docs/bob-task-briefs.md`. Routine build/test must make no network or paid call. Live validation remains unchecked until the operator explicitly authorizes it and supplies environment-only credentials.
