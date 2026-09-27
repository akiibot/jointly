# Jointly dual-workflow demonstration plan

The final demonstration must show both supported workflows over the same deterministic verification core:

1. **IBM Bob IDE + MCP** — the currently working assisted investigation workflow using the Bob mode, five Skills, and nine typed MCP tools.
2. **Website + watsonx.ai** — the hackathon target: one approved synthetic public repository, one authorized operator, real watsonx inference, verified repair, and explicit approval before one integration PR is published.

Do not present the current fake lifecycle, bundled sample, imported passport, mocked provider, or historical Bob passport as a live watsonx website run. Until B1 and the website driver are complete, demonstrate the website only as the honest mode/provenance and capability UI described below.

## Before recording

1. Use the pinned Node 22.19.x runtime; run `npm install`, `npm run build`, `npm test`, and `npm run jointly -- doctor`.
2. Run `npm run jointly -- setup`, keep `.bob/mcp.json` uncommitted, reload Bob, and confirm the `ai-merge-investigator` mode, five Skills, and nine `jointly` tools.
3. Verify the frozen fixture refs and common base reported by `doctor`; do not substitute moved refs.
4. Prepare separate tabs for Bob IDE, terminal evidence, the website, and a clearly labeled archived fallback.
5. Confirm that no credential, token, personal notification, or unrelated repository appears on screen.
6. If demonstrating the final website lane, verify B1 evidence, the authorized live capability check, executor isolation/canary tests, hosted authorization, and exact publication approval first.

## Opening

> Two independently developed changes can merge cleanly and pass their existing tests while violating each other's intent. Jointly uses AI only for bounded proposals, then relies on one deterministic core for Git isolation, execution, evidence, and the final scoped verdict.

## Lane A — working Bob IDE + MCP workflow

Show the Bob mode, Skills, and tool list before running anything. Then perform or replay the following artifact-backed sequence:

1. `register_run` with base `jointly-demo-base`, change A `agent/coupon` and `scenarios/checkout/coupon-prompt.md`, and change B `agent/payment-retry` and `scenarios/checkout/payment-retry-prompt.md`. Show the frozen commit identities.
2. `prepare_workspaces`. Show Base, A, B, and combined, and show that the merge has no textual conflict.
3. `run_existing_tests` for all four workspaces. Explain that their historical fixture counts are Base 38, A 50, B 46, and combined 58; use the actual current structured results on screen.
4. Use the Bob Skills to extract the two intent contracts and rank the shared `Order.total` interaction. Show requirement IDs and citations rather than ungrounded prose.
5. Generate the focused interaction test and run `run_generated_test` before repair. A valid demo failure is an assertion in the exact generated test; setup/import/syntax/zero-test failures are not collisions. Show the separately persisted `runtime-diagnosis.json` that links the observed failure to the hypothesis and requirement IDs; execution classification alone cannot satisfy a repaired-collision safe verdict.
6. If a requirement conflict appears, show the preserved original statements and explicit resolution authority. Do not silently rewrite an invariant to fit the known fixture.
7. Apply the proposed repair only to the isolated combined workspace and export the reviewable patch.
8. Rerun the exact generated test and existing suites, then run the configured stability matrix. Show preserved before/after execution records and the unchanged test digest. Complete the separate `repair-review.json` stage using the fresh verification-context digest; explain that the review supplements rather than overrides deterministic evidence.
9. Collect evidence and generate the passport only if every current gate passes. Otherwise show the real non-safe verdict and blocker.

Say:

> Bob proposes intent, tests, and repair in the IDE workflow. The Jointly MCP tools and shared core control every repository action and compute the evidence-backed verdict.

The automated MCP protocol regression protects registration, four-workspace preparation, bounded diff access, and structured existing-test execution. It does not replace a real Bob session or prove the semantic stages were performed.

## Lane B — website workflow

### What can be shown now

1. Open the **sample** route and point out the historical/unverified banner and “nothing is running now” message.
2. Open **imported passport**, import a valid file, then show that a malformed import stays in import mode and never falls back to sample success.
3. Run `npm run local`, open the printed loopback URL, and show the capability response. It must identify `fake-replay`, real inference unavailable, generated-code execution unavailable, and the current isolation blocker.
4. Show deterministic preflight, the exact frozen base and two change commit identities, both prompt paths, and read-only local run history. Explain that the service never fetches, switches, or silently substitutes refs.
5. Explain that the session uses an HttpOnly same-origin cookie whose token is never printed.
6. Show that no Run button is offered while the shared deterministic driver and executor isolation are unavailable.

This proves honest provenance and failure behavior, not a complete website investigation.

### Final hackathon website lane after its gates pass

1. Sign in as the sole authorized operator; show that an unauthorized identity cannot read runs, events, artifacts, resolutions, candidates, or publication routes.
2. Select the one approved synthetic public repository and two frozen PR heads with a verified common base.
3. Start a run and show real watsonx provider/model/template provenance from B1 without exposing credentials.
4. Follow actual persisted stages and events. Pause for requirement resolution when needed; never animate fabricated progress.
5. Show the deterministic generated-test failure, isolated candidate repair, unchanged regression test, fresh existing tests, stability evidence, and scoped passport.
6. Review the exact candidate diff and current source/target revisions.
7. Explicitly approve publication. Only then create one integration branch/PR; never mutate or merge either source branch automatically.
8. Show the resulting PR and bind it to the approved candidate. If publication was not authorized or did not succeed, leave this step visibly pending.

Say:

> The website uses watsonx.ai for bounded proposals, while the same Jointly core executes tests and decides whether the evidence is sufficient. Publication is a separate, explicit human approval.

## Shared-core comparison

For equivalent frozen fixture inputs, show or retain regression evidence that both lanes produce the same canonical execution shapes, classifications, evidence gates, and scoped verdict. Provider prose and request metadata may differ; deterministic outcomes may not.

## Closing

> Jointly preserves two useful workflows: an expert can investigate inside IBM Bob through typed MCP tools, and an authorized operator can use the website with watsonx.ai. In both cases, AI proposes; Jointly isolates, executes, verifies, and records what actually happened.

## Failure fallback

- Stop a stalled live action rather than improvising shell commands or changing evidence.
- Use a labeled archived passport or screenshot only for the exact step it proves.
- Keep Bob-session evidence, fake/provider tests, live inference, deployment, and PR publication as separate claims.
- Never claim a step succeeded without its persisted artifact and current authorization.
