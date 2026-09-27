# Jointly implementation inventory and allocation checkpoint

**Checkpoint:** 2026-09-27 (Asia/Dhaka)
**Plan:** Revision 5 of `docs/improvement-implementation-plan.md`
**Purpose:** establish the delivered baseline before additional core AI work and reserve consequential implementation for the participant in IBM Bob IDE.

This inventory distinguishes implemented code from planned, mocked, participant-owned, and externally validated work. A checked deterministic test is not evidence of a Bob session, live watsonx inference, GitHub publication, deployment, or submission.

## Allocation decision

- **Reserved for participant implementation in Bob IDE:** B1, the real `@jointly/watsonx-adapter` transport. The package currently contains documentation only. No SDK, IAM, endpoint, retry, or live inference code exists.
- **Reserved for a later participant Bob review:** B2, a substantial cross-workflow integration/security review after the website and Bob/MCP paths both execute through the shared deterministic core.
- **Codex may continue independently:** deterministic execution/evidence work, Bob/MCP compatibility regressions, fake-backed lifecycle and website controls, strict import/UI validation, security boundaries, hosted interfaces, fixtures, documentation, and tests that do not implement B1 or perform B2.
- **External/operator gates remain external:** credentials, paid/live provider calls, GitHub App setup, deployment, publication approval, integration PR creation, recording, and final submission checks.

## Current capability inventory

| Area | Status | Evidence and boundary | Owner for next work |
| --- | --- | --- | --- |
| Node/toolchain setup | Implemented locally | Node 22.19.x pinned in package metadata, `.nvmrc`, `.node-version`, and CI | Codex; deployment image pin remains later |
| Runner classification | Implemented and tested | Structured Vitest reports distinguish assertion, setup/import/syntax, zero/skipped, timeout, signal, cancellation, and environmental failure | Codex |
| Child environment separation | Partially implemented | Explicit allowlisted environment and redirected child config/home paths; hostile-code filesystem/process/network isolation remains unfinished | Codex before enabling generated-code execution |
| Evidence/schema/verdict core | Implemented for current deterministic flows | Versioned records, fingerprints, requirement links/resolutions, stability, compatible and repaired gates; repaired-collision safety also requires separately bound runtime diagnosis and fresh repair review | Codex; B2 later reviews integration |
| Bob IDE mode, rules, five Skills | Existing and preserved | `ai-merge-investigator` workflow remains documented and supported | Codex compatibility; participant operates it |
| Nine-tool MCP server | Existing and regression-tested | Protocol test registers a run, prepares four workspaces, reads a diff, and runs structured existing tests through the actual MCP client/transport | Codex compatibility; B2 later reviews equivalence |
| Provider-independent reasoning | Implemented and tested | Strict stages, fake transport, context/prompt policy, configuration aliases, cancellation/error contracts | Codex complete for W5 foundation |
| Real watsonx transport | **Not implemented; reserved** | `packages/watsonx-adapter` has no transport source or provider dependency | **Participant, Bob Task B1** |
| Live watsonx capability | Not validated | No credential/model/region/quota/latency/cost smoke test | Participant/operator after B1 and explicit authorization |
| Local lifecycle API | Partial, fake-backed | Authenticated loopback/checkpoint/event/artifact lifecycle plus bounded secret-redacted events, HttpOnly same-origin browser bootstrap, and confined built-dashboard serving; deliberately reports real inference and generated-code execution unavailable | Codex |
| Website workflow | Partial | Explicit sample/import/connected-local modes, honest capability blockers, deterministic preflight, frozen refs/prompts, labeled simulation start/cancel/resume, error categories, evidence links/downloads, and current passport scope; no real deterministic website driver or real inference | Codex, excluding B1 |
| Fixture/stability proof | Implemented locally | Repaired checkout, compatible cart, second collision, controlled failure scenarios, seeded schedules | Codex; known-answer validation only |
| Hosted authorization/isolation | Interface foundation only | Pure owner/repository/installation checks and cross-boundary regressions exist; no hosted routes, identity provider, durable store, or worker isolation exists | Codex plus external infrastructure |
| GitHub selection/publication | Policy foundation only | Exact-candidate approval, staleness, privileged-path, and idempotency contracts are tested; no GitHub App, remote publication, or PR has been executed | Codex interfaces; operator authorizes external actions |
| Bob B2 review evidence | Not started | Start only after both paths use the shared core and B1 is present | Participant in Bob IDE |
| Submission/demo evidence | Inventoried but incomplete | Historical Bob artifacts and missing media/platform checks are listed with source status; Revision 5 B1/B2 and dual-workflow evidence remain pending | Participant/operator |

## Authoritative next order

1. Keep the W1 credential boundary closed: do not enable execution of model-generated repository code until the stronger executor boundary and canary tests pass.
2. Participant implements **B1** in Bob IDE using `docs/bob-task-briefs.md` and `packages/watsonx-adapter/CONTRACT.md`. Codex does not implement it.
3. In parallel, Codex continues only independent work: Bob/MCP regressions, website session/preflight/history/import/UI work, deterministic orchestration, isolation, hosted interfaces, fixtures, and documentation.
4. After B1, separately authorize and run the minimal live watsonx capability check. Mock tests cannot close this gate.
5. Complete the constrained hackathon vertical slice: one approved synthetic public repository, one authorized operator, real watsonx inference, verified repair, and explicit approval before one integration PR is published.
6. When both Bob/MCP and website paths use the same deterministic services, participant performs **B2** in Bob IDE.
7. Complete dual-workflow demonstration evidence and final signed-in platform/submission checks. Broader multi-user/repository/platform expansion stays deferred.

Bob-owned tasks block only their real dependents: B1 blocks genuine watsonx inference; B2 blocks final cross-workflow review and submission-readiness claims. Neither blocks independent deterministic, security, UI, or documentation work.

## Contribution boundary

Work already present before B1—including this inventory, the classification fix, evidence schemas, reasoning contracts/fake, lifecycle foundation, UI modes, fixtures, Bob/MCP protocol regression, and documentation—is Codex-authored or pre-existing as recorded in Git history and `docs/improvement-progress.md`. Do not attribute it to Bob retrospectively. Only files and findings created or materially changed during authenticated B1/B2 sessions may be entered as Bob contributions in `docs/bob-development-evidence.md`.
