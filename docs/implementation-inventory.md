# Jointly implementation inventory and allocation checkpoint

**Checkpoint:** 2026-09-27 (Asia/Dhaka)
**Plan:** Revision 6 of `docs/improvement-implementation-plan.md`
**Purpose:** record the delivered baseline, recovered Bob adapter contribution, Codex compatibility port, and remaining external/integration gates.

This inventory distinguishes implemented code from planned, mocked, participant-owned, and externally validated work. A checked deterministic test is not evidence of a Bob session, live watsonx inference, GitHub publication, deployment, or submission.

## Allocation decision

- **B1 implementation:** IBM Bob produced the initial real adapter in task `47634a6502c2e9247f90f58a10cbca05`, preserved at snapshot `7b36558dd9d585a122533767e5d0942bf8fec932`. After the Bob allowance was exhausted, Codex ported it to the current shared contracts and completed offline compatibility/security tests. These contributions remain separately attributed.
- **B2 reservation:** the substantial Bob cross-workflow integration/security review was not performed because Bob became unavailable. It remains an unmet submission-evidence gate, not a reason to invent or relabel Codex work.
- **Codex continuation:** deterministic execution/evidence work, Bob/MCP compatibility regressions, fake-backed lifecycle and website controls, strict import/UI validation, security boundaries, hosted interfaces, fixtures, documentation, and integration of the delivered B1 work.
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
| Real watsonx transport | Implemented; live-unverified | IBM SDK `1.7.16`, IAM, bounded transport retries, deadlines/cancellation, error mapping, redaction, trusted-template/model binding, and shared mocked contract tests | Bob initial implementation; Codex current-contract port and verification |
| Live watsonx capability | Not validated | No credential/model/region/quota/latency/cost smoke test | Participant/operator after B1 and explicit authorization |
| Local lifecycle API | Partial, fake-backed | Authenticated loopback/checkpoint/event/artifact lifecycle plus bounded secret-redacted events, HttpOnly same-origin browser bootstrap, and confined built-dashboard serving; deliberately reports real inference and generated-code execution unavailable | Codex |
| Website workflow | Partial | Explicit sample/import/connected-local modes, honest capability blockers, deterministic preflight, frozen refs/prompts, labeled simulation start/cancel/resume, error categories, evidence links/downloads, and current passport scope; no real deterministic website driver or real inference | Codex, excluding B1 |
| Fixture/stability proof | Implemented locally | Repaired checkout, compatible cart, second collision, controlled failure scenarios, seeded schedules | Codex; known-answer validation only |
| Hosted authorization/isolation | Interface foundation only | Pure owner/repository/installation checks and cross-boundary regressions exist; no hosted routes, identity provider, durable store, or worker isolation exists | Codex plus external infrastructure |
| GitHub selection/publication | Policy foundation only | Exact-candidate approval, staleness, privileged-path, and idempotency contracts are tested; no GitHub App, remote publication, or PR has been executed | Codex interfaces; operator authorizes external actions |
| Bob B2 review evidence | Not started; Bob unavailable | Do not mark complete or substitute an independent review as Bob evidence | Participant only if Bob access returns |
| Submission/demo evidence | Inventoried but incomplete | B1 snapshot evidence exists; B2, live provider, deployment, rehearsals, media, and final platform checks remain pending | Participant/operator |

## Authoritative next order

1. Keep the W1 credential boundary closed: do not enable execution of model-generated repository code until the stronger executor boundary and canary tests pass.
2. Preserve the B1 Bob snapshot and Codex port attribution; keep the full offline build and 165-test regression green.
3. Separately authorize and run the minimal live watsonx capability check. Mock tests cannot close this gate.
4. Wire the real adapter into the shared website orchestration only after credential-separated executor isolation and canary tests pass; retain Bob/MCP regressions.
5. Complete the constrained hackathon vertical slice: one approved synthetic public repository, one authorized operator, real watsonx inference, verified repair, and explicit approval before one integration PR is published.
6. Perform B2 in Bob only if Bob access returns. Otherwise disclose it as incomplete and do not claim final Bob review evidence.
7. Complete dual-workflow demonstration evidence and final signed-in platform/submission checks. Broader multi-user/repository/platform expansion stays deferred.

B1 no longer blocks implementation, but its external live-provider gate still blocks genuine watsonx claims. B2 blocks only the claimed Bob integration review/submission-evidence gate; it does not block independent deterministic, security, UI, or documentation work.

## Contribution boundary

Work already present before B1—including this inventory, the classification fix, evidence schemas, reasoning contracts/fake, lifecycle foundation, UI modes, fixtures, Bob/MCP protocol regression, and documentation—is Codex-authored or pre-existing as recorded in Git history and `docs/improvement-progress.md`. Do not attribute it to Bob retrospectively. Only files and findings created or materially changed during authenticated B1/B2 sessions may be entered as Bob contributions in `docs/bob-development-evidence.md`.
