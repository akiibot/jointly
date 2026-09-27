# Jointly improvement implementation progress

This log records verified work against Revision 5 of `docs/improvement-implementation-plan.md`. A checked implementation item is not evidence of a Bob session, live provider access, deployment, publication, or submission unless that evidence is explicitly linked.

## Baseline

- Date: 2026-09-27 (Asia/Dhaka)
- Starting commit: `9d77aa253c015034b734a035a4f3acb5d2ef1567`
- Fixture refs: base `4704bf064cada31db98180cbed8b3b9fd54ff67e`; coupon `2b8990f3e149c9752cbad2423c6f705ff42fe1ed`; payment retry `2d12dbbd6ec875ed535308a8a6f3494bb3bc1257`
- Pre-change verification: build passed; 71 tests passed across 21 files.
- Pre-existing user change: `docs/improvement-implementation-plan.md` was untracked and identical to the supplied final attachment. It was preserved and revised in place.

## W0 — baseline and ownership

Status: in progress

Delivered:

- Revised the complete plan first to Revision 4, then to the post-inventory Revision 5 allocation with one authoritative remaining order.
- Reserved participant-owned Bob tasks B1 (real watsonx adapter) and B2 (shared-workflow integration review/debugging).
- Added detailed prompts, deliverables, acceptance tests, and evidence template in `docs/bob-task-briefs.md`.
- Updated architecture rules to preserve Bob IDE + MCP and website + watsonx modes over one deterministic core.
- Verified locked engines and pinned Node `22.19.0` through root engines, lockfile, `.nvmrc`, `.node-version`, and CI. The current Vercel build consumes the root engine constraint; future worker/container definitions must repeat the same pin when W17 exists.

Pending:

- Full submission/run-archive inventory.
- Participant execution and authentic evidence for B1/B2.
- Any external account, credential, deployment, publication, recording, or submission work.

## W1 — credential-safe runner and structured classification

Status: in progress; core classification fix verified, stronger filesystem/process sandbox boundary remains for W6/W13

Delivered:

- Repository commands receive an explicit allowlisted environment instead of inherited `process.env`.
- Parent/provider-style canary credentials are omitted; explicit credential-like variables are rejected.
- Child home/config/cache/temp paths are redirected into the run; host npm and Git user configuration are disabled.
- Execution records contain environment-policy version and variable names, never values.
- Stdout/stderr persistence and UI excerpts are bounded; signal and timeout termination are recorded.
- Generated-test classification consumes a configured Vitest JSON report.
- Only a failed assertion in the exact generated test can produce `confirmed-collision`.
- Missing/malformed reports and exit 127 are environmental failures; collection/import/syntax/setup failures are `test-invalid`; zero/all-skipped runs are `insufficient-evidence`.
- Before/after evidence preservation remains covered in the MCP tool tests.
- Bob/MCP rules were updated for the new conservative classification without changing the tool workflow.

Verification:

- Actual temporary Vitest fixtures cover assertion failure, missing import, syntax failure, setup exception, and all-skipped execution.
- Runner tests cover parent secret omission, forbidden explicit secret names, bounded logs, timeout, and signal termination.
- Verification at the end of W5 Codex-owned work: build passed and 110 tests passed across 26 files.

Remaining:

- Add the W6 execution boundary that prevents repository code from reading backend credential files, process state, sockets, or metadata; environment scrubbing alone is not claimed as a hostile-code sandbox.
- Add runtime-model requirement-linked explanation checks before a collision becomes passport-eligible.
- Complete canonical execution records and phase/verdict gates in W2.

## W2/W3 — evidence integrity and requirement decisions

Status: deterministic W2 gates verified; W3 runtime-review orchestration and Bob B2 remain pending

Delivered:

- Version-2 manifests freeze validated configuration, commands, stability policy, prompt digests, commits, and source-tree identities.
- Continuing a run uses the frozen configuration rather than silently reloading a changed `jointly.yaml`.
- Provenance checks detect source-ref and prompt drift and are enforced before repair export and a safe passport.
- CLI and MCP existing-test runs use one versioned summary shape plus immutable per-execution records.
- Before- and after-repair existing-test records are preserved separately.
- Existing tests require structured Vitest counts; exit zero without executed passing tests cannot satisfy a safe verdict.
- Generated-test executions preserve the exact source artifact and digest; post-repair verification rejects a changed regression test.
- Evidence collection uses phase/basis-specific requirements and derives links from intent/hypothesis/collision artifacts instead of attaching every supplied requirement to every artifact.
- Repair metadata binds the patch digest to the frozen combined tree, separates production and regression-test files, and refuses edits to existing tests.
- Safe-verdict gates return structured failure reasons and require complete contracts, valid requirement/hypothesis links, exact stability policy, input integrity, phase-complete evidence, and basis-specific proof.
- Compatible pairs can produce a scoped safe verdict without a fake repair.
- Material conflicts block safety until a traceable operator or precedence-rule resolution is recorded; unresolved decisions remain non-safe.
- Strict Zod contracts validate current manifests, intents, hypotheses, decisions, collision evidence, existing-test summaries, execution records, stability results, repair metadata, and evidence summaries at their read boundaries.
- Legacy manifests, execution records, existing-test summaries, and dashboard passports are explicitly labeled legacy/unverified and cannot be upgraded to a safe current verdict.
- Every execution records a self-verifying input fingerprint covering frozen refs/trees/prompts/config, intent and hypothesis content, decision content, command/environment policy, structured report, generated test, repair candidate, and current workspace state.
- Passport generation recomputes workspace states and rejects stale existing-suite or per-iteration stability fingerprints.
- Requirement decisions must preserve exact original statements, cite authority, bind the affected test, and invalidate prior verification when changed.
- The coupon/retry fixture includes an intentionally unresolved proposal; it does not fabricate operator approval.
- Passport HTML displays preserved originals, revised contract, rationale, authority, and affected tests.

Remaining:

- W6 now supplies versioned local state, stage-result, artifact, and event records. Cross-workflow metrics and the broader W7 reporting schema remain pending.
- Add the W3 fresh runtime repair-review stage through W6 orchestration.
- Extend the interactive dashboard views beyond the generated passport HTML when W8 begins.
- Complete Bob B2 review of the shared evidence path after both workflows are integrated.

## W4 — setup and deterministic doctor

Status: verified locally; live provider capability remains external

Delivered:

- `jointly doctor` checks Node 22.19.x, Git/npm, installed dependencies, build outputs, config, project/prompt paths, exact refs, common base, and structured report configuration.
- The sample uses explicit `origin/agent/*` refs and no longer depends on author-local branches.
- Missing local refs produce a recorded remote-tracking suggestion but are never fetched, switched, or silently reinterpreted.
- watsonx and Bob readiness are separate warnings; provider values are never printed and live access remains unverified.
- `jointly setup` creates ignored absolute-path Bob MCP configuration, is idempotent, supports spaces, and preserves an existing MCP file by producing a merge candidate.
- The committed machine-specific MCP path was replaced with an example; general installation no longer requires a Protos account.

Remaining:

- Execute the setup regression suite on Windows; the implementation is path-library based but only the current macOS host and space-containing temporary paths were exercised here.
- B1 and external service access are required for SDK compatibility, model entitlement, and authentication checks.

## W5 — provider-independent reasoning boundary

Status: Codex-owned portion verified; Bob B1 and live capability checks pending

Delivered:

- Added `@jointly/reasoning` with seven strict stage payloads, bounded request/result contracts, optional streaming interface, cancellation, normalized errors/usage/request IDs, and deterministic fake transport.
- Added versioned prompt templates, bounded/redacted context construction, oracle exclusion, strict citations/paths/IDs, truncation/refusal handling, and token/deadline budgets.
- Added explicit watsonx configuration aliases and presence-only reporting.
- Added a participant-owned `packages/watsonx-adapter` slot containing no SDK, IAM, endpoint, or transport implementation.
- CI-safe tests cover valid fake inference, malformed/truncated/adversarial output, unknown requirement IDs, path traversal, cancellation, budget exhaustion, secret redaction, oracle/overflow omission, config handling, and normalized rate-limit errors.

Remaining:

- Bob Task B1 implements the real transport, retry/auth/token-refresh behavior, SDK/API metadata, and its contract tests.
- No live credential, project, model, quota, region, latency, or cost claim has been tested.
- W6 now enforces at most two attempts for each fake-replay stage and persists attempt counts. Provider call/token/cost budgets, transport-versus-semantic retry separation, and bounded real repair attempts remain pending.

## W6 — local lifecycle foundation

Status: partial; checkpointed fake-replay contract verified, deterministic run driver/UI/real inference blocked or pending

Delivered:

- Added a loopback-only Fastify server with Host/Origin checks and a per-process local-session token on every run route.
- The API accepts only the fixed checkout fixture in explicitly labeled `fake-replay` mode. Capabilities report real inference, generated-code execution, and an isolation profile as unavailable.
- Added one-active-run enforcement, atomically persisted version-2 lifecycle state, append-only sequenced events, cancellation, and restart recovery that marks orphaned work interrupted.
- Added strict fake stage-result and artifact contracts. Every stage artifact is registered by a fixed ID, confined by realpath/symlink checks, digest-checked, and revalidated before resume or download.
- Added per-stage bounded attempts, explicit early-stop outcomes, persisted attempt/model-request references, an `awaiting-resolution` checkpoint, authority-validated requirement decisions, and resume of incomplete work only after completed artifacts revalidate.
- Fake passports must contain structured verification gates; a `SAFE_TO_MERGE` claim cannot bypass failed gates. The default replay ends `INSUFFICIENT_EVIDENCE` and never represents simulated output as verification.
- Added authenticated history, preflight, frozen-ref reporting, sequenced SSE replay, requirement-resolution, resume, passport, and registered-artifact API routes. SSE currently replays a snapshot after a sequence cursor; continuous tailing is still UI integration work.
- The fake lifecycle covers the ordered stage names but does not claim that deterministic Git/test/passport operations ran.
- Tests cover the complete fake lifecycle, SSE cursor replay, bounded malformed-artifact failure, requirement-resolution pause/rejection/authorized resume, stale-checkpoint rejection, honest early stop, failed-gate override denial, authentication, cross-origin rejection, denial of a real-run shape, duplicate submission, cancellation without late success, and interrupted recovery.

Remaining:

- Replace fake stage production with the shared deterministic core and reasoning engine, including canonical current-schema passport output and child-process cancellation.
- Add credential-separated executor isolation before enabling any real-provider generated code. Current capabilities deliberately deny that path.
- Add a live SSE tail/keepalive and event redaction schema. Same-origin UI serving, browser-session bootstrap, replay cursor, and safe indexed downloads are implemented.
- B1 and external access are still required for a genuine watsonx run; B2 remains later.

Verification:

- Full workspace build passed.
- Full workspace suite passed: 119 tests across 27 files, including 9 local lifecycle/API tests.
- `jointly doctor --json` reported deterministic readiness `true`, provider readiness `false`, the exact Node 22.19.0 pin, and only the expected missing watsonx/Bob warnings without exposing values.
- `git diff --check` passed.

## W7 — honest stability records

Status: complete for local deterministic validation; no live-model or hosted claim

Delivered:

- Added strict version-2 stability records that distinguish process iterations, worker concurrency, and scenario-declared request concurrency. Undeclared request concurrency is recorded as `null`, not guessed.
- Each process iteration now uses and records a deterministic seed derived from the frozen base seed plus its zero-based iteration index.
- Every iteration preserves its scenario label, outcome, exit code, timeout state, duration, bounded stdout/stderr artifacts, and—when a manifest is present—its execution record and input fingerprint.
- Schema invariants reject inconsistent aggregate totals, missing or unordered iteration results, scenario mismatches, and seeds that do not follow the declared strategy.
- Repetition remains labeled as repeated execution of one configured interaction scenario; it is not presented as multiple kinds of compatibility coverage.
- Added a validation-only checkout oracle that clones the frozen broken-combined ref into a unique temporary repository, applies the documented coupon-aware replay repair only there, injects the real Vitest interaction test, and verifies the protected source refs remain unchanged.
- The seven-case matrix covers no coupon, both valid coupon boundaries, invalid-coupon immutability, sequential same-key replay, different-key attempts, and eight concurrent same-key requests sharing one in-process store. Sequential and concurrent replay assert that the finalized order remains unchanged.
- CI now fetches complete history so frozen scenario refs are available to the regression harness; this does not modify or publish those refs.
- Added a compatible-cart fixture with independent discount and audit prompts/patches. Its harness creates actual sibling Git commits from one base, proves both parents equal the frozen base, merges them without conflict, and executes the preserved base test plus a combined interaction test.
- The compatible interaction verifies integer-cent rounding, audit recording, and defensive audit copies in one combined behavior. It is labeled a known-answer validation fixture, not model-generated evidence.
- Added a second hidden-collision fixture for profile updates versus cached reads. Actual sibling commits share one verified base; each branch passes two tests, and their cleanly merged existing suite passes three tests.
- Its interaction test primes the cache, updates the profile, and fails by assertion because `Ada` remains visible instead of `Grace`. The harness rejects setup/syntax failures, applies a revision-aware cache repair, verifies the interaction test bytes did not change, and then passes all four tests.
- Added external abort-signal support to the credential-scrubbed command runner. Cancellation terminates the process tree, records `terminationReason: cancelled`, and preserves bounded logs instead of appearing as a timeout or late success.
- Added a strict five-case `failure-scenarios.json` contract and actual-execution regression: a conflicting Git merge, an independently failing change command, a syntactically invalid Vitest file with structured classification, a timed-out child, and an operator-cancelled child.
- Every failure case retains its real command result and stdout/stderr artifact paths. Schema invariants require every case exactly once, the correct outcome, conflicted filenames for textual conflicts, and conservative classifications for invalid/timeout/cancellation cases.
- Added a checkout schedule that consumes each stability iteration's `JOINTLY_SEED`. Five required boundary cases always run, while a deterministic PRNG varies later price, quantity, coupon, and request-mode inputs.
- The schedule proves same-seed reproducibility and different-seed variation, executes real sequential/different-key/concurrent requests, and reports actual request counts in each scheduled case. This is still one scenario family, not multiple discovered collision types.
- Reasoning context rejects oracle-classified inputs, and all known-answer fixtures/repairs are documented as validation-only, preventing them from being counted as runtime model discovery evidence.

Verification:

- Full workspace build passed.
- Full workspace suite passed at 124 outer tests across 31 files. Nested validation additionally executes 17 repaired-checkout cases, the compatible fixture, and the profile-cache branch/combined/before-repair/after-repair suites.
- Core tests validate distinct deterministic iteration seeds, declared request concurrency, preserved log output, and strict parsing of the completed version-2 record; MCP tests validate explicit unknown request concurrency and failed-iteration records.
- `jointly doctor --json` remained deterministically ready with provider readiness correctly false; `git diff --check` passed.

## W8 — dashboard modes and provenance foundation

Status: partial; explicit viewing modes verified, connected investigation controls pending

Delivered:

- Added explicit sample, imported-passport, and connected-local routes with persistent mode navigation and visible source/provenance banners.
- The default bundled passport is labeled as a historical sample with “nothing is running now”; imported files and explicit passport URLs are labeled separately.
- Import errors remain in import mode. Local API failures remain in local mode and explicitly state that no sample result was substituted.
- Added strict parsing for the public local-capabilities response. The local shell honestly renders fake replay, real inference, generated-code execution, isolation status, and blockers.
- No local Run button is rendered while the shared deterministic driver and executor isolation remain unavailable.
- Updated workflow copy to describe Bob IDE and watsonx.ai as proposal modes over Jointly's shared deterministic evidence/verdict gates.
- Added an HttpOnly `SameSite=Strict` same-origin browser-session bootstrap. Protected local APIs accept the cookie or the existing explicit test/tool header; cross-authority origins and cross-site bootstrap are denied.
- The local server now confines and serves the built dashboard from the same loopback origin, and `npm run local` starts the combined read-only experience without printing its session token.
- Connected-local mode strictly validates and renders deterministic preflight plus persisted local run history. Run creation remains deliberately unavailable in the browser.
- Connected-local mode also loads the authenticated `/api/refs` response and displays the exact common base, both configured change refs/commits, and their prompt paths. The client requires two unique change IDs and valid full Git object IDs.
- Static serving rejects malformed/traversal paths and does not expose files outside the dashboard build directory.
- Passport import now enforces a one-MiB bound for selected files and streamed/declared remote responses before JSON parsing. Nested changes, intents, requirements, hypotheses, current/legacy test records, collision evidence, stability totals, verification gates, timestamps, and known verdicts are validated before rendering.
- The viewer now understands current schema-v2 `beforeRepair`/`afterRepair` existing-test summaries and displays post-repair results when present instead of treating summary metadata as workspaces.
- All six supported verdicts now have explicit safe, danger, warning, or blocked presentation in both the dashboard and exported HTML passport. Non-safe outcomes cannot inherit success styling, and verification-gate failures are displayed as blockers with escaped content.

Remaining:

- Add guarded run controls after the shared deterministic driver and executor-isolation gate are complete. Browser session bootstrap, preflight, authenticated frozen-ref details, and read-only history are complete.
- Stream/replay real stages, cancellation, resume, and requirement-resolution review without fabricated progress.
- Complete detailed error-category rendering, evidence downloads, accessibility, and browser-level lifecycle coverage. Verdict rendering plus strict nested passport and file-size validation are complete for the fields the dashboard renders.

Verification:

- Dashboard build passed and 10 dashboard tests passed; MCP passport export passed 19 MCP tests.
- Tests distinguish sample/import provenance, reject malformed capabilities, and prove local failure HTML contains neither sample success nor a nonfunctional Run button.
- Local-server tests cover same-origin cookie bootstrap, cookie-authenticated history, cross-origin denial, confined static serving, and traversal rejection.
- Live loopback smoke: dashboard `200`, authenticated session response valid, and read-only history returned `[]`; no run or provider call was started.

## Reserved/external status

- Allocation checkpoint completed in `docs/implementation-inventory.md` before further core AI work.
- Bob B1: ready from the exact brief and package contract, but not started and not implemented.
- Bob B2: not started.
- Live watsonx credential/model smoke test: not run.
- GitHub App registration or installation: not performed.
- Hosted deployment: not performed.
- Integration PR publication: not performed.
- Submission/platform checks: not completed.

## Revision 5 compatibility checkpoint

Delivered:

- Confirmed that `packages/watsonx-adapter` remains documentation-only and reserved its real transport implementation for participant-owned Bob Task B1.
- Added `packages/watsonx-adapter/CONTRACT.md` plus a current-file handoff, exact Bob prompt, deliverables, and acceptance tests.
- Added an MCP protocol regression that uses the actual client and in-memory transport to register a run, prepare all four workspaces, read a bounded diff, and execute structured existing tests. This protects the existing Bob IDE + MCP path while shared-core and website work evolves.
- Updated the implementation inventory, contribution boundary, dual-workflow demonstration plan, and rehearsal gates without attributing prior work to Bob.

Pending:

- Authentic participant execution and evidence for B1 and B2.
- Complete website-to-shared-core wiring and cross-workflow equivalence evidence.
- Live inference, deployment, publication, and submission checks.

Verification:

- Full workspace build passed.
- Full workspace suite passed at the allocation checkpoint: 128 outer tests across 31 files, including 18 MCP tests.
- `jointly doctor --json` reported deterministic readiness `true`, provider readiness `false`, and the exact Node 22.19.0 pin.
- `git diff --check` passed for tracked changes.

Post-checkpoint W8 verification:

- Full workspace build passed.
- Full workspace suite passed: 135 outer tests across 31 files (38 checkout, 50 core, 10 dashboard, 12 local server, 19 MCP, and 6 reasoning). One initial all-workspace run hit two five-second core-test timeouts under transient load; the isolated core suite and the complete rerun both passed without code changes.
- `jointly doctor --json` remained deterministically ready on Node 22.19.0 and correctly reported provider readiness `false`.
- Live loopback dashboard/session/history smoke passed without starting a run or provider request.
- The authenticated ref regression resolved the configured base and both remote-tracking change refs to full Git object IDs without fetching or switching.
- `git diff --check` passed.

## Post-checkpoint independent completion pass

Status: verified locally where stated; Bob, live provider, hostile-code isolation, GitHub, deployment, and submission evidence remain pending

Delivered:

- Added explicit dashboard categories for invalid request, backend unavailable, authentication failure, budget exhaustion, test setup failure, collision, interruption, and unknown failure. Connected-local history exposes authenticated state/event/passport links without substituting sample success.
- Added clearly labeled simulation-only start/cancel/resume controls over the existing authenticated fake lifecycle. The UI states that this performs no watsonx inference, generated-code execution, repair, or safety verification.
- Added strict SSE replay parsing and a latest-run event timeline that displays persisted sequence/stage messages without fabricated progress percentages or ETAs.
- Added current passport schema, verification basis, input integrity, scenario, separate runtime diagnosis, requirement decisions, complete generated-test access, repair download, and validated-passport export. Safe wording is scoped to the exact tested candidate.
- Added a provider-independent aggregate reasoning budget ledger for call, schema-correction, repair-attempt, input/output token, elapsed-time, and estimated-cost ceilings. B1 transport retries remain a separate participant-owned responsibility.
- Added bounded secret redaction to persisted local failures/events and defensive SSE headers.
- Split execution classification from semantic diagnosis. A repaired-collision safe verdict now requires `runtime-diagnosis.json` linked to the exact hypothesis, requirements, and before-repair evidence.
- Added `repair-review.json` as a fresh-review gate bound to the exact repair digest, generated-test digest, and verification-context digest. Bob/MCP instructions and the demo plan now produce and explain both artifacts.
- Made generated MCP setup idempotent when a preserved primary config requires `mcp.generated.json`; added Windows path-with-spaces rendering coverage while retaining the existing Windows junction path.
- Added fixture-first and one-trusted-project local setup documentation with the residual same-user execution warning.
- Added pure hosted authorization/publication policy contracts covering owner/repository/installation isolation, exact-candidate approval, source/target drift, current write access, privileged paths, and idempotent publication reconciliation. These are not hosted implementation evidence.
- Added a source-linked submission inventory and H1 operational runbook. Current public event timing was rechecked; detailed signed-in submission fields, the temporarily inaccessible guide, media, Bob B1/B2 evidence, deployment, and receipt remain assigned to final participant checks.

Verification:

- Full workspace build passed.
- Full workspace suite passed: 143 outer tests across 32 files (38 checkout, 55 core, 11 dashboard, 13 local server, 19 MCP, and 7 reasoning).
- `jointly doctor --json` reported deterministic readiness `true` on Node 22.19.0 and provider readiness `false` with all five provider settings absent.
- `git diff --check` passed.

No Bob-authored, live-provider, deployed, or published contribution is claimed by this pass.
