# Jointly — complete implementation plan: IBM Bob-assisted development, watsonx.ai runtime, and GitHub-connected verification

**Created:** 2026-09-27
**Revision:** 5 — post-inventory allocation with the real watsonx adapter reserved for Bob IDE
**Status:** Authoritative implementation plan; independent local work may proceed, while Bob evidence, live inference, publication, and deployment remain explicit gates
**Reviewed baseline:** `main`, commit `9d77aa2`
**Repository:** `/Users/yeanul/Documents/ChatGPT/IBM/jointly`
**Audience:** The next implementation chat and project owner

## Navigation

- [Baseline and scope](#1-purpose-and-handoff-instructions)
- [Complete issue register](#4-complete-issue-and-improvement-register)
- [Live implementation progress](improvement-progress.md)
- [Current implementation inventory and allocation](implementation-inventory.md)
- [Evidence and verdict contracts](#6-evidence-contracts-and-verdict-policy)
- [Original work packages W0–W10](#7-work-packages)
- [Implementation order](#8-milestone-order-and-dependency-gates)
- [Copyable next-chat prompt](#14-copyable-prompt-for-the-next-chat)
- [Hosted architecture and release stages](#17-github-connected-hosted-product-architecture)
- [Hosted work packages W11–W17](#18-hosted-work-packages)
- [Hosted APIs and records](#19-hosted-api-and-data-contracts)
- [Integration PR semantics](#20-git-semantics-staleness-and-pr-output-policy)
- [Hosted verification](#21-hosted-verification-and-operational-acceptance)
- [Release gates and dependencies](#22-scope-gates-and-complete-delivery-checklist)
- [Hackathon assessment](#24-honest-hackathon-assessment-of-the-implemented-idea)
- [Eligibility audit](#25-eligibility-audit-and-submission-gate)
- [Bob IDE workstream W18](#26-w18--substantive-bob-ide-development-and-evidence)
- [Runtime contracts and migration](#27-runtime-contracts-migration-and-validation)

## 1. Purpose and handoff instructions

Implement trustworthy evidence and a website where authorized users connect GitHub, select two PRs, observe automated investigation and repair powered by IBM watsonx.ai, review results, and explicitly publish a new integration PR. Use IBM Bob IDE substantively to design, implement, debug, test, and review the project, preserving real task evidence. Include local development, onboarding, broader verification, metrics, access control, execution isolation, deployment, and submission work.

**Eligibility conclusion:** this technology division is consistent with the published event guide and the organizer clarification supplied by the user. It is not a certification of this team's prize eligibility. Bob IDE must remain central and demonstrable; a token mention or retrospective screenshots cannot establish that. Registration, original work, licensing, data restrictions, complete on-time submission, and applicable participation terms remain separate requirements. See Section 25 for the eligibility audit and Section 26 for the mandatory Bob workstream.

**Organizer clarification:** the user verified the attached Discord message as coming from an organizer. It says no application-facing Bob API is provided for this hackathon, allows Bob Shell scripting, and directs application-side LLM use to watsonx.ai. Do not convert a Bob authentication key or Shell CLI into an assumed public inference entitlement.

This is the single complete handoff plan. All prior reliability, GitHub, isolation, UX, and submission concerns remain. The website runtime uses watsonx.ai instead of Bob Shell. The existing Bob IDE + MCP investigation remains a supported operating mode and shares the same deterministic verification core; it is not the hosted inference service. Regression coverage must prove that verification changes do not break either mode.

Revision 5 records the required pre-AI implementation inventory in `docs/implementation-inventory.md`. The inventory confirms that the provider-independent reasoning foundation exists but the real watsonx adapter does not. B1 therefore remains a genuine, consequential participant-owned Bob IDE implementation; Codex may continue only unrelated deterministic, security, website, hosted-interface, documentation, and regression work while B1 is in progress.

Work is divided explicitly:

- **Codex-owned implementation:** deterministic core, schemas, runner classification, credential isolation, provider-independent reasoning contracts and fakes, orchestration, dashboard, supported Bob/MCP compatibility, the constrained hosted path, tests, and documentation.
- **Participant-owned Bob Task B1:** implement the real watsonx transport adapter from the prepared contract and acceptance tests. Codex must not implement or retrospectively claim this task.
- **Participant-owned Bob Task B2:** perform a substantial integration review/debugging pass after both supported workflows are wired, fix or direct fixes for concrete findings, and retain authentic Bob task evidence.
- **External/operator gates:** account provisioning, secrets, live paid inference, GitHub App registration/installation, deployment, publication, recordings, and submission checks. Mocks never complete these gates.

This document contains both completed checkpoints and proposed work; `docs/implementation-inventory.md` and `docs/improvement-progress.md` identify which is which. Recheck the current checkout before changing anything; another chat may have made progress since this baseline. Preserve unrelated changes. Implement in dependency order and update the checklists with actual evidence. Do not mark a milestone complete merely because its UI exists or its mocked tests pass.

Read `AGENTS.md`, `BUILD_GUIDE.md`, `docs/implementation-plan.md`, and this plan first. Keep the original implementation plan as historical M1–M9 status; track this improvement program separately. Amend conflicting documentation explicitly as the corresponding change is implemented. This user-requested revision intentionally supersedes the older rule that Bob performs all runtime reasoning. Before code migration, update that rule in AGENTS/BUILD_GUIDE/architecture through W0 and W3: the website uses watsonx.ai for reasoning proposals; the supported Bob IDE + MCP mode uses Bob for proposals; both use the same deterministic execution, evidence, and verdict core. Preserve every unrelated safety rule.

No credential has been created and no Bob session has been run by this revision. Authorization covers local, non-destructive implementation and tests. It does not by itself authorize account creation, deployment, paid inference, pushing, publication, merging, or submission. Missing credentials must not block deterministic fixes, fake-provider integration, dashboard work, or preparation of reviewable external setup artifacts.

## 2. What is already implemented

- TypeScript/npm workspace monorepo: `@jointly/core`, `@jointly/mcp-server`, `@jointly/dashboard`, and checkout fixture.
- Fastify checkout API with in-memory repositories and Vitest tests.
- Four isolated Git workspaces: Base, A, B, A+B; repair belongs only in A+B.
- Nine STDIO MCP tools and five Bob skills using the `ai-merge-investigator` mode.
- Local CLI preflight through `npm run jointly -- analyze`.
- Static TypeScript/Vite dashboard, including How it works and passport import. It does not currently start investigations.
- M1–M8 marked complete; M9 remains pending in the original plan.
- Build and 71 tests across 21 files passed in this chat's review. These are a dated baseline, not a required final test count.
- Working tree was clean after that verification.

### Existing demonstration

Base ref: `jointly-demo-base`; changes: `agent/coupon`, `agent/payment-retry`. Coupon changes `total` to `subtotal - discountAmount + tax`; retry checks the pre-coupon `subtotal + tax`. A 4000 subtotal, 400 discount, and 360 tax yields 3960 total. The first payment succeeds; same-key replay incorrectly returns HTTP 400 rather than the original result with HTTP 201. This is a rejected retry, not a demonstrated duplicate payment.

Historical existing-suite counts: Base 38, A 50, B 46, combined 58. Do not confuse these with the main repository's 71 tests.

### Evidence provenance

- Historical successful Bob run on a teammate's Windows machine: `20260926T190933Z-084882a7`.
- Bundled dashboard fixture: `packages/dashboard/public/passport.json`, reporting that run ID, `SAFE_TO_MERGE`, and 50/50 stability. It contains an abbreviated test snippet and is not a complete original run archive.
- Local earlier partial run: `runs/20260926T172439Z-1356e0ba`.
- The completed Windows run directory was not available locally during review.
- Screenshots live in `bob_sessions/`; no claim that every screenshot or final submission asset was verified.
- Public URLs recorded in the project: https://github.com/akiibot/jointly and https://jointly-ai-merge.vercel.app. Reverify access when preparing publication.

### Prior context

The idea evolved from MergeShadow into intent-aware integration testing. Relevant previous chats are `Review IBM Bob hackathon guide` (`01a0d98b-be02-7372-a589-1c3c1529dc68`) and `Review IBM Bob hackathon guide (4)` (`01a0dce2-a0d9-76c1-a077-95f24d1a2295`). A local summary also exists at `/Users/yeanul/Documents/ChatGPT/IBM/output/JOINTLY_PROJECT_BRIEF.md`; this plan must remain usable without that sibling file.

## 3. Product objective and boundaries

Target experience: sign in to Jointly, grant access to selected GitHub repositories, select two PRs and confirm their intent, launch an isolated watsonx-powered investigation, follow real progress, inspect the verified repair/passport, and explicitly create a new integration PR. Also retain a local mode using local refs and a static passport viewer.

Automatic means investigation, generated tests, and repair inside an isolated workspace after the user starts a run. It does not mean silently publishing commits or merging PRs. Textual conflicts are reported separately; the product differentiator remains hidden behavioral collisions between changes that merge cleanly.

Keep these invariants:

1. IBM watsonx.ai supplies application-side reasoning proposals. IBM Bob IDE is a substantive development and validation partner. Core, MCP, execution services, and dashboard remain deterministic; the orchestrator calls the provider through validated stages and never invents test results.
2. Exactly two changes from one common Git base; TypeScript/npm/Vitest first.
3. Source branches and the developer checkout remain unchanged by investigations.
4. Only the combined workspace can receive a proposed production repair.
5. Existing assertions and the confirmed regression test cannot be weakened to obtain a pass.
6. Compile/setup errors never count as semantic collisions.
7. The backend computes verdicts from validated artifacts. A model may propose a summary or disposition; it cannot force a verdict.
8. The dashboard displays backend evidence and passport verdicts; it has no independent analysis logic.
9. No automatic merge or mutation of either original source branch. A separate publication service may create a new integration branch and PR only after an authorized user approves the exact verified candidate.
10. Preserve local mode and the static viewer. Deliver H1 for the one approved synthetic public repository, then consider P1/P2 expansion after their gates. Anonymous arbitrary-repository execution, N-change analysis, and additional language adapters remain deferred.
11. The original in-memory MVP remains intact until its reliability gates pass. Hosted persistence and queues are a deliberate post-MVP extension; record this decision and update conflicting architecture rules before implementing it.
12. Preserve two supported reasoning entry points: Bob IDE + MCP and the website + watsonx.ai. Both call the same deterministic verification services and must have regression coverage; neither may maintain a separate weaker verdict path.
13. Before any repository or model-generated code executes, its process receives an explicit allowlisted environment and a credential-free filesystem/process boundary. Inheriting the server environment is forbidden. Separate processes alone are not sufficient if code can read secrets through files, sockets, process inspection, mounted directories, or metadata endpoints.
14. Every hosted release enforces authorization and isolation for every user, run, event stream, and artifact it exposes. Later releases may harden or scale isolation, but never add basic tenant protection retroactively.

## 4. Complete issue and improvement register

Evidence labels: **Reproduced** = exercised in this review; **Inspected** = visible in source/documents; **Historical** = previous chat or stored evidence; **Proposed** = a design improvement, not a confirmed bug.

| ID | Issue or improvement | Evidence | Priority | Work package |
| --- | --- | --- | --- | --- |
| J01 | Unknown nonzero runner exit becomes confirmed collision | Reproduced: exit 127 plus `vitest: command not found` | P0 | W1 |
| J02 | Regex classification can confuse setup/runtime/assertion failures | Inspected | P0 | W1 |
| J03 | Passport does not validate both full intent contracts and requirement links | Inspected | P0 | W2 |
| J04 | Results are not bound to current source/test/repair versions | Inspected | P0 | W2 |
| J05 | Evidence summary's missing-required count covers only three artifacts | Inspected | P0 | W2 |
| J06 | Before/after existing-test records can overwrite each other | Inspected; generated-test preservation was previously fixed | P0 | W2 |
| J07 | Passport accepts a positive stability count without matching configured policy | Inspected | P0 | W2/W7 |
| J08 | No supported successful compatible-pair path without a collision and repair | Inspected | P1 | W2/W7 |
| J09 | Coupon-aware repair supersedes an explicit old retry invariant | Inspected/historical | P0 | W3 |
| J10 | CLI array and MCP object differ for existing-test summaries | Inspected | P1 | W2/W4 |
| J11 | Fresh clones may lack local feature branch names | Historical; README assumption | P1 | W4 |
| J12 | Node 18+ claim needs checking against locked Vite/Vitest engines | Inspected compatibility concern, not reproduced | P1 | W4 |
| J13 | Machine-specific MCP path and team-specific README complicate setup | Inspected | P1 | W4 |
| J14 | Manual orchestration and passport transfer make first use difficult | Inspected | P1 | W5/W6/W8 |
| J15 | Runtime AI integration: replace planned Bob Shell hosting with watsonx.ai; keep optional developer Shell workflow | Organizer clarification / user-approved direction | P1 | W5 |
| J16 | Repeating one process does not prove varied scenarios or in-process concurrency | Inspected | P1 | W7 |
| J17 | One seeded collision gives limited generalization evidence | Inspected | P1 | W7 |
| J18 | Bundled sample and imported evidence need distinct provenance | Inspected | P1 | W8 |
| J19 | Dashboard nested input validation and malformed-data handling are shallow | Inspected | P1 | W8 |
| J20 | Show real stages, run history, errors, patch and evidence exports | Proposed | P1 | W6/W8 |
| J21 | No measured productivity, human-intervention, or separate development/runtime cost baseline | Review finding | P1 | W9 |
| J22 | Stale AGENTS/spec checklists, offline claims, and inconsistent video durations | Inspected | P1 | W10 |
| J23 | Rehearsals, complete archive, final Bob screenshot, backup video pending | Historical/local docs | P1 | W10 |
| J24 | Final video, slides, statements, cover, and public access need verification | Not verified, not asserted absent | P1 | W10 |
| J25 | Need restrained safety claims and a visible substantive Bob role | Judge assessment | P1 | W3/W8/W9/W10 |
| J26 | Keep provider credentials out of frontend/executed code; enforce model action boundaries | Required by proposed integration | P0 before live runs | W5/W6 |
| J27 | GitHub PR integration and hosting promoted into scope; N changes/languages still deferred | User-requested revision | P1 hosted | W11–W17 / Section 16 |
| J28 | GitHub sign-in, selected-repository access, installation authorization | Proposed | P0 hosted | W11 |
| J29 | Frozen PR heads/common base, intent snapshots, stale-run detection | Proposed | P0 hosted | W12 |
| J30 | Credential-separated isolated execution and private-code handling | Required for hosted mode | P0 hosted | W13 |
| J31 | Durable jobs, events, budgets, recovery, artifacts and retention | Proposed | P0 hosted | W14 |
| J32 | Human-approved publication of an exact verified integration candidate | Proposed | P1 hosted | W15 |
| J33 | GitHub-connected web journey, access-aware evidence and onboarding | Proposed | P1 hosted | W16 |
| J34 | Real hosted deployment, operational checks, restricted-beta gates | Proposed | P1 hosted | W17 |
| J35 | Eligibility/attribution: substantive Bob IDE contribution and complete authentic evidence | Official guide + organizer clarification | P0 submission | W18 / Section 25 |
| J36 | watsonx credentials/model capability, typed inference stages, cost/error handling and migration | New runtime design | P0 runtime | W5 / Section 27 |
| J37 | Repository commands currently inherit the complete server environment, which can expose provider or publication credentials | Reproduced in `core/runner.ts` | P0 before generated code | W1/W6/W13 |
| J38 | Root Node `>=18` contradicts locked Vite/Vitest engines | Inspected from installed lockfile packages | P0 setup | W0/W4/W17 |
| J39 | R2 authorization requirements conflicted with R3 wording that deferred tenancy enforcement | Plan review | P0 hosted | W11/W14/Section 22 |
| J40 | Main milestone order conflicted with the runtime migration checklist | Plan review | P0 planning | Section 8/27 |
| J41 | Original Bob IDE + MCP mode needs regression protection while the website path is added | User requirement | P0 compatibility | W2/W6/W8/W18 |

Judge assessment in this chat was approximately 7.5/10, with technology 8, presentation 6.5, business value 7, originality 8. Those are subjective estimates, not official scores or a predicted ranking. Improve proof and usability before adding breadth.

## 5. Local foundation architecture

```text
Browser: local Jointly dashboard
  │ same-origin HTTP + server-sent events
  ▼
@jointly/local-server (proposed TypeScript package)
  ├─ preflight, validated inputs, one active run, cancellation
  ├─ persisted lifecycle and redacted event stream
  ├─ bounded stage orchestrator
  │    ├─ @jointly/watsonx-adapter (server-side model calls)
  │    └─ validated proposals → deterministic run-bound operations
  ├─ credential broker boundary; secrets never enter repository workspaces
  ├─ repository runner with a minimal allowlisted child environment
  └─ deterministic evidence validation and artifact delivery
                        │
                        ▼
            existing @jointly/core / MCP server
                        │
                        ▼
            isolated Base / A / B / combined
                        │
                        ▼
              versioned passport + patch
```

Serve the built local dashboard and API from the same loopback origin. During development, proxy API/events through Vite. Retain a static-only build with local-install instructions; do not make it silently connect to arbitrary localhost services. A separate hosted configuration uses the authenticated backend in Section 17.

The local server process may hold a watsonx credential, but child build/test/generated-test processes must not inherit it. Construct child environments from a documented allowlist such as the executable path, temporary/home substitute owned by the run, locale, deterministic test variables, and explicitly approved project variables. Deny provider, GitHub, cloud, CI, SSH, npm-token, and proxy credentials by default. Use credential-free workspaces, do not mount dotfiles or backend state, and add canary-secret tests covering environment, files, process arguments, reachable sockets, and metadata/network access appropriate to the selected local isolation level. R1 is a trusted-repository mode, not a hostile-code sandbox; nevertheless, server credentials must remain inaccessible.

Use an in-memory active-process registry with validated JSON state and append-only events under `runs/`. Recover run history from disk. No database or hosted queue is required for the local foundation. The hosted release adds durable storage and job leasing as described in Sections 17–20. A new frontend framework is not required.

The local foundation package names are proposed, not existing paths; additional hosted packages are mapped in Section 11. Keep responsibilities separate even if implementation consolidates them after checking workspace build order.

## 6. Evidence contracts and verdict policy

### Versioned artifacts

Introduce runtime schemas in core, shared by MCP/backend and the viewer where appropriate. Use the existing schema library if practical; TypeScript assertions alone are insufficient. Add `schemaVersion` and an explicit legacy import adapter.

Proposed per-run files:

```text
manifest.json                   frozen input refs, prompt hashes, config, runtime versions
state.json                      lifecycle, current stage, attempt, process/session metadata
events.ndjson                   redacted events with increasing sequence numbers
intents/<change-id>.json         immutable extracted contracts
interaction-surfaces.json
hypotheses.json
requirement-resolutions.json    explicit decisions, if any
generated-tests/<test>.test.ts
executions/<execution-id>.json   stage, result, counts, hashes, log/report references
test-results/<execution-id>/     structured report and bounded/redacted logs
collision-evidence.before-repair.json
collision-evidence.after-repair.json
repair.patch
repair-summary.md
stability.json
failure-scenarios.json           controlled validation outcomes; never live discovery evidence
evidence-summary.json
metrics.json
passport.json
passport.html
```

Keep compatibility summaries only as derived indexes; never overwrite authoritative execution records. Freeze project root, commands, input prompts, invariants, and stability settings at registration. Continuing a run must not silently reload changed `jointly.yaml` settings.

Each execution should identify its run, attempt, stage, workspace, frozen commits, production-tree fingerprint, test-content hashes, command/config fingerprint, relevant lockfile/runtime identity, start/end timestamps, termination reason, test counts, and report/log artifacts. Capture actual execution inputs, including untracked generated tests. Exclude generated logs and build output deterministically so hashes are stable. Avoid hashing all dependencies on every iteration; record resolved dependency identity and document shared-node_modules limitations.

Hash binding detects changed or mismatched artifacts; it does not authenticate a maliciously edited local archive. Imported passports remain unverified external data unless their evidence is actually checked.

### Required safe-verdict gates

Compute gates centrally, return structured reasons when any fail, and have both MCP and CLI use the same implementation:

- Two schema-valid contracts match both registered change IDs and prompt snapshots.
- Requirements have unique IDs and valid sources; hypotheses/tests reference existing IDs.
- Required baseline/build/test stages pass with actual tests executed.
- Independent failures and textual conflicts stop the semantic-repair flow.
- Generated tests exercise the declared cross-feature behavior and have a recorded requirement-linked model review; deterministic code validates evidence structure, not semantic meaning.
- Every selected hypothesis has a supported disposition; skipped work is explicit.
- All required artifacts exist, parse, and match the applicable stage/source/test fingerprints.
- Repaired path: valid reproduction, exportable repair, immutable before/after evidence, unchanged regression test, unchanged original tests, and passing post-repair checks.
- Compatible path: meaningful interaction coverage passes; no invented collision or placeholder patch is required.
- Stability completes the frozen policy, not merely any positive number of runs.
- No unresolved requirement conflict, interrupted stage, or stale result remains.

Preserve the existing `SAFE_TO_MERGE` enum for compatibility if useful, but add a `verificationBasis` such as `repaired-collision` or `compatible-pair`, a tested-scope summary, and limitations. Display “Verified within tested scope” alongside the verdict. Do not claim universal semantic correctness or imply automatic merge permission.

Absent adequate compatible-pair coverage, emit `INSUFFICIENT_EVIDENCE`. Pending requirement decisions should block a safe verdict and produce a review state; they are distinct from a source-code merge approval.

## 7. Work packages

### W0 — Establish the implementation baseline

- [x] Inspect current Git status, applicable instructions, dependencies, and available runtime.
- [x] Publish the B1 and B2 Bob task briefs, reserve those contributions, and update the conflicting runtime architecture rules before migrating code. Bob-owned work blocks only the live adapter and final integration-evidence gates that depend on it.
- [x] Record current commit and source-ref SHAs; preserve user changes.
- [x] Run the current build and tests once and record deviations from the 71-test baseline.
- [x] Verify engine requirements from the locked dependency versions. Pin one compatible Node 22 release in `engines`, local version files, CI, and the current frontend deployment engine constraint; repeat the pin in future worker/container definitions.
- [x] Inventory run artifacts and submission assets without treating fixture data as newly verified evidence.
- [x] Maintain `docs/improvement-progress.md` with completed work, tests, limitations, and next steps.

**Exit:** reproducible starting state and no unrelated changes lost.

### W1 — Correct test classification (J01–J02)

**Primary files:** `packages/mcp-server/src/tools/run-generated-test.ts`, `packages/core/src/runner.ts`, `packages/core/src/types.ts`, and their tests.

- [x] Write a regression for the reproduced exit-127 command-not-found case before fixing it.
- [x] Add a Vitest structured-report adapter. Keep configured commands allowlisted; require an adapter-compatible configuration rather than concatenating untrusted flags.
- [x] Record test discovery, executed tests, failed assertions, import/collection errors, and process termination independently.
- [x] Only treat a valid assertion failure in the exact generated interaction test as an execution-level collision candidate. Requirement linkage and runtime explanation remain a separate eligibility gate.
- [x] Separate execution classification from the runtime model's requirement-linked explanation; require both for a confirmed claim.
- [x] Map syntax/import/collection/setup errors to `test-invalid`; command startup, timeout, kill, and infrastructure problems to `environment-failure` with a reason.
- [x] Treat unrecognized or incomplete output conservatively; do not fall through to confirmed collision.
- [x] Do not mistake every production TypeError for an invalid test; use structured report phase/location and leave ambiguous cases unconfirmed.
- [x] Reject zero-test, all-skipped, missing-report, and exit-zero-with-no-verification outcomes as insufficient or non-confirming evidence.
- [x] Classify from structured evidence, not a truncated UI excerpt. Bound capture while streaming; persist useful diagnostics without unbounded in-memory accumulation.
- [x] Replace inherited `process.env` for repository build/test/generated-test children with an explicit environment-policy object. Record the policy version and approved variable names, never values.
- [ ] Keep provider, GitHub, cloud, CI, package-registry, SSH, and control-plane credentials out of child environments and workspaces. Treat a missing required project variable as a preflight/configuration decision, not a reason to inherit the parent environment.

**Tests:** actual minimal Vitest fixtures for assertion failure, missing import, syntax failure, setup exception, skipped/zero tests; process fixtures for exit 127, signal, timeout, and malformed report; canary secrets in parent environment and backend-only files are unavailable to repository children while explicitly approved harmless variables remain available.

**Exit:** the reproduced false positive is impossible; unknown failures never display as confirmed collisions.

### W2 — Enforce evidence integrity and consistent schemas (J03–J08, J10)

**Primary files:** core `types.ts`, `manifest.ts`, `evidence.ts`, `passport.ts`, `cli.ts`; MCP `context.ts` and evidence/test/passport tools; shared schemas and tests.

- [ ] Implement Section 6 schemas and source/config snapshots.
- [x] Make CLI and MCP produce the same canonical execution records and summary shape.
- [x] Preserve original pre-repair existing results as well as post-repair ones. Existing generated-test before/after protection must remain intact.
- [x] Replace “missingRequired checks three files” with phase/verdict-specific completeness and validity checks.
- [x] Validate two complete contracts and actual requirement-to-hypothesis-to-test relationships; do not link every requirement to every artifact indiscriminately.
- [x] Recompute fingerprints before verdict/export; invalidate downstream results after any code, generated-test, prompt-resolution, or verification-config change.
- [x] Freeze generated regression tests after confirmation; revisions require a fresh before-repair reproduction.
- [x] Check source refs and existing-test fingerprints after investigation. Source refs/prompts, intent/hypothesis/decision content, current workspace states, repair candidates, structured reports, and per-iteration stability inputs are bound and rechecked.
- [x] Separate production repair and added regression-test files in export metadata. Verify patch applicability to the recorded combined pre-repair revision.
- [x] Ensure persisted before/after generated-test source is the version actually executed; do not attach one current file to two historical results.
- [x] Add compatible-pair verdict support under the scoped policy above.
- [x] Preserve legacy passports as explicitly legacy imports; never manufacture missing proof to upgrade them.

**Tests:** remove or corrupt each required gate; one missing contract; duplicate/mismatched IDs; stale repair/test/config; incomplete or reduced stability; modified original assertion; source ref movement; CLI/MCP consistency; valid compatible pair; valid repaired pair; legacy read behavior.

**Exit:** deliberately stale/incomplete records cannot produce a safe verdict, and a complete compatible pair needs no fake repair.

### W3 — Resolve conflicting requirements explicitly (J09, J25)

**Primary files:** `.bob/skills/extract-intent-contract`, `discover-interactions`, `repair-collision`, `generate-merge-passport`; mode rules; core schemas/passport; dashboard intent/repair views.

- [x] Preserve both original prompts and extracted contracts unchanged.
- [x] Identify explicit requirements versus assumptions; do not silently relabel an inconvenient explicit requirement as an assumption.
- [x] Record conflicting IDs, original statements, proposed replacement, rationale, affected tests, and authority for the decision.
- [x] For coupon/retry, explicitly disclose that the old `PAYMENT-6` formula conflicts with the coupon-aware combined contract. Preserve idempotency and no-mutation requirements. The checked-in proposal remains unresolved rather than claiming unauthorized supersession.
- [x] Let an operator accept a material requirement change, or apply a previously supplied unambiguous precedence rule and record its source. Without authority, remain awaiting resolution/review.
- [x] Explain which requirements were preserved and which were intentionally revised in the passport.
- [x] Make normalization of IDs an explicit mapping, not a process that alters meanings to fit a known demo.
- [x] Require a separate runtime review stage with fresh verification context to inspect repair scope and test preservation; it supplements deterministic tests and is not an independent correctness guarantee. Use Bob IDE separately to review the implementation and failure cases during development.

**Tests:** unresolved conflict blocks safe verdict; authorized resolution is traceable; unaffected requirements retain identity; no silent overwrite of original intent; later resolution changes invalidate previous verification.

**Exit:** the demo never claims to satisfy two mutually inconsistent original formulas unchanged.

### W4 — Reliable setup and preflight (J11–J13)

**Commands:** `jointly doctor` and `jointly setup` are implemented; `jointly serve` remains W6 work.

- [x] Check Git, supported Node/npm, installed dependencies, build artifacts, config schema, prompt paths, common base, and both refs.
- [x] Pin the repository to the tested Node `22.19.0` release consistently in root/package engines, `.nvmrc`, `.node-version`, CI, and the current frontend deployment engine constraint. Future worker/container definitions must use the same release; re-verify if the lockfile changes.
- [x] Resolve explicitly configured local refs, or offer/record an unambiguous remote-tracking fallback. Never silently fetch, switch branches, or reinterpret ambiguous refs.
- [x] Make the documented sample usable from a clean clone without relying on the author's local feature branches.
- [ ] Validate watsonx service configuration, SDK/API compatibility, and selected model access separately from deterministic readiness. Optional developer Bob IDE/Shell readiness is a separate check and must not block a hosted user.
- [x] Generate portable local MCP setup without overwriting a user's existing servers or committing machine paths. Use documented variable expansion only if supported by the installed version; otherwise use an ignored generated configuration.
- [x] Report key presence without printing it. Report live authentication as unverified until tested.
- [ ] Make setup idempotent on macOS and Windows; retain junction support and test paths containing spaces. **Partial:** repeated primary/generated MCP setup is idempotent, paths with spaces are tested, Windows path rendering is unit-tested, and existing workspace code retains Windows junction selection; an actual Windows run remains pending.
- [x] Support one explicitly selected trusted local target repository; keep repository root distinct from project subdirectory. Do not take arbitrary build commands from a web form.
- [x] Provide a fixture-first quick start and separate real-project configuration instructions. Remove Protos-specific account requirements from general installation.

**Tests:** absent local branches, remote-tracking fallback, invalid base, missing prompts, unsupported runtime, missing provider configuration, malformed config, Windows paths, existing MCP entries.

**Exit:** a fresh user can reach a clear ready state or actionable blockers with documented steps.

### W5 — reasoning contracts and watsonx.ai adapter (J15, J26, J36)

**Ownership split:** Codex implements provider-independent contracts, schemas, fake transport, prompt/context policy, adapter interfaces, and acceptance tests. **Participant-owned Bob Task B1 implements the real `@jointly/watsonx-adapter` transport** using those contracts. Codex may review and test B1 after it is delivered but must not implement it or claim its contribution.

**Proposed packages:** `packages/watsonx-adapter` and `packages/reasoning`; keep provider transport separate from prompt/stage policy. The real transport package remains a failing/disabled capability until B1 is completed and live access is separately verified.

**Credential distinction:** the Bob API-key screenshot does not supply a watsonx credential. Set up IBM Cloud/watsonx through the event access route, then obtain the approved service endpoint/region, project or supported space, authorized model ID, and IBM Cloud IAM credential. No service is assumed provisioned. Prefer the official Node SDK with supported IAM authentication; validate installed SDK method names and API version before implementation. Do not invent a Bob endpoint or silently fall back to Bob Shell or another provider.

- [x] **Codex:** define the server-only adapter contract for bounded inference requests, optional streaming, cancellation, normalized usage, errors, and provider request IDs; provide a deterministic fake and provider-independent engine/validation tests. B1 must add the reusable fake/real transport contract suite.
- [ ] **Bob B1:** implement the real watsonx SDK/REST transport against the prepared contract without weakening schemas, budgets, redaction, or cancellation behavior.
- [x] Define configuration aliases in `.env.example`: `WATSONX_API_KEY`, `WATSONX_SERVICE_URL`, `WATSONX_PROJECT_ID` (or explicitly supported space configuration), `WATSONX_MODEL_ID`, `WATSONX_API_VERSION`. These are Jointly-defined variable names, mapped explicitly to the SDK, not a claim that the SDK autodiscovers them.
- [ ] Keep IAM credentials/tokens in a secret manager or local backend environment. Prefer a scoped service identity where available; never expose keys to GitHub jobs, model prompts, browser, logs, artifacts, or repository execution sandboxes.
- [ ] Manage token refresh with the SDK or a tested cache; no credentials in URLs/arguments. Use bounded refresh retries and stop on persistent permission failure.
- [ ] **External validation after B1:** verify account/project/model entitlement in the actual region. Record a capability snapshot and a small live smoke test. API key creation alone is not evidence of working inference.
- [ ] Select one available model by measured structured-output quality, TypeScript/test generation, latency, context limit, and budget. Do not promise a particular model or free quota before account verification.
- [x] Implement seven bounded stage types: extract intent independently for A and B; discover interactions; propose generated test; diagnose confirmed evidence; propose repair; review repair; draft report. The backend controls stage order and executes approved operations.
- [x] Reuse useful intent schemas/checklists from `.bob` as reviewed, versioned runtime prompt templates. Markdown Bob skills are not automatically executable watsonx agents; translate explicitly into schemas, context builders, and orchestration.
- [x] Start with typed JSON results and deterministic dispatch. Native tool calling is optional and must be capability-tested; do not rely on every model supporting every SDK option.
- [x] Validate complete responses against strict schemas. Reject unknown operations, invalid paths, duplicate IDs, broken source citations, truncated JSON, refusals, or unsupported output formats. Frozen input digest enforcement remains an orchestrator responsibility in W6.
- [x] Keep the provider away from unrestricted commands and direct filesystem/GitHub writes. Test source and repair proposals are validated artifacts; core applies them only in approved run paths and executes them only in the sandbox.
- [x] Send bounded relevant source/prompt/diff/report context with labels and hashes. Redact secrets, exclude unrelated files and oracle answers, and record omissions. Orchestration will convert material omissions to insufficient evidence in W6.
- [x] Persist model ID, prompt-template version/hash, context digest, finish reason, request IDs, duration, token usage when provided, and validated output. Region/API/SDK metadata remains B1 transport work. Store concise explanations, not hidden chain-of-thought.
- [x] Add hard caps on calls, repair attempts, schema-correction retries, input/output tokens, total elapsed time, and aggregate run cost estimate. Suggested initial policy: at most two schema corrections and two repair attempts; tune from measurements, not unlimited loops.
- [ ] Separate SDK transport retries from semantic stage retries; prevent nested retry multiplication. Honor rate-limit delays within an overall deadline. Distinguish auth, quota, timeout, refusal, invalid output, and unsupported capability.
- [x] Cancellation aborts pending requests locally. Stopping later orchestration stages and persisting cancellation remain W6 responsibilities; do not assume provider cancellation removes all charges already incurred.
- [x] Use deterministic fake responses for CI, including malformed/adversarial output. Keep live smoke/evaluation tests separate and explicitly budgeted.
- [x] Make model declarations non-authoritative: neither a claimed test pass nor a suggested safe verdict bypasses persisted execution evidence.

**Tests:** IAM expiry/refresh; missing/wrong project; unauthorized/unavailable model; 429/5xx/backoff; timeout/cancel; truncated stream; bad JSON/schema; hallucinated requirement references; forbidden action/path; context overflow; token/cost cap; successful multi-stage fixture flow.

**Codex exit:** provider-independent stages, fake transport, configuration validation, and engine/validation tests pass; real adapter, its reusable transport contract suite, and live checks remain explicitly blocked on B1/external access. **Full W5 exit:** B1 makes fake and mocked real transports pass the same contract suite, followed by one separately authorized small real inference check on the actual deployment account. No hosted runtime dependency on Bob Shell or `BOB_API_KEY` remains. One successful inference call does not prove autonomous repair.

### W6 — Local investigation orchestration (J14, J20, J26)

**Proposed package:** `packages/local-server`; reuse Fastify if suitable.

- [x] Bind the implemented API listener to loopback only; reject unexpected Host/Origin and require a local-session token for run routes. UI serving and a browser token bootstrap remain W8 work. No unauthenticated run endpoint is exposed.
- [x] Permit one active investigation initially. The current API accepts only the fixed `checkout-fixture` + explicitly labeled `fake-replay` profile; general registered repository/ref/prompt inputs remain disabled until their validators are wired.
- [ ] Register one run deterministically before the runtime starts; bind MCP context to it so model proposals cannot create duplicate runs or access another run by changing IDs.
- [ ] Persist lifecycle and append-only redacted events atomically; allow reconnect/replay by sequence number. **Partial:** version-2 state is atomically replaced, sequenced events support SSE cursor replay, operational messages apply bounded secret redaction, and SSE disables proxy buffering; live tail/keepalive and durable hosted storage remain.
- [x] Orchestrate the fixed bounded stage sequence for the fake-replay contract: setup, baseline, intent, hypotheses, generated test, diagnosis, requirement resolution if needed, repair, verification, stability, passport. This check does not claim the shared deterministic operations ran.
- [x] Advance the fake workflow only after validating its strict stage-result contract, exact registered artifact path, realpath/symlink confinement, content schema, and digest. Missing/invalid artifacts receive at most one retry and then fail.
- [x] Support an explicit early-stop stage outcome and preserve its non-safe verdict. Real textual-conflict and independent-failure detection still depend on the deterministic driver.
- [x] Preserve versioned checkpoints with a frozen input digest, per-stage attempt ID, optional model request ID, artifact digest, and completed stages. Resume revalidates completed artifacts and resumes only incomplete work; the future deterministic driver must additionally revalidate its frozen source/config fingerprint.
- [x] After server restart, mark any orphaned active run interrupted until checked; never infer completion from the absence of a process.
- [x] Cancellation aborts the active fake stage, preserves state/events, and prevents late completion. The shared command runner now accepts an abort signal, terminates the process tree, and preserves logs with `terminationReason: cancelled`; the future deterministic stage driver must pass the coordinator signal through.
- [x] Keep file-serving restricted to fixed registered stage artifact IDs; reject unregistered IDs, traversal, symlinks, escape paths, stale content, and digest mismatches.
- [ ] Route both website/watsonx and Bob IDE/MCP proposals through shared deterministic services for run registration, workspace preparation, execution classification, evidence validation, stability, and passport generation. Keep the existing MCP tool surface supported; do not fork verdict logic into the local server.
- [ ] Launch every repository command through the W1 environment policy and credential-free workspace boundary. Test that model-generated code cannot read a parent canary environment value, backend credential file, control socket, or other-process arguments. Document residual trusted-local-repository limitations.

Suggested API contract:

| Endpoint | Responsibility |
| --- | --- |
| `GET /api/health` | Versions/capabilities, no secrets |
| `GET /api/preflight` | Setup checks for the selected local repository |
| `GET /api/refs` | Bounded refs from that repository |
| `POST /api/runs` | Validate/freeze inputs, enqueue the single active job; return 202 and run ID |
| `GET /api/runs` | Compact persisted local history |
| `GET /api/runs/:id` | Validated state and stage results |
| `GET /api/runs/:id/events` | Redacted server-sent events with reconnect support |
| `POST /api/runs/:id/cancel` | Idempotent cancellation |
| `POST /api/runs/:id/resume` | Revalidate and resume an interrupted run |
| `POST /api/runs/:id/resolutions` | Record an operator requirement decision |
| `GET /api/runs/:id/passport` | Completed passport or explicit unavailable state |
| `GET /api/runs/:id/artifacts/:artifactId` | Download a registered safe artifact |

Keep job state separate from verdict: `queued`, `running`, `awaiting-resolution`, `interrupted`, `failed`, `cancelled`, `completed`. A completed investigation may have a non-safe verdict.

**Tests:** full lifecycle with fake inference; early stops; duplicate submission; incompatible stage artifact; restart/resume; stale resume; cancellation; cross-origin mutation; invalid paths; failed passport gate despite the model claiming success; Bob/MCP and website flows produce the same canonical records and verdict for equivalent inputs; canary credentials remain inaccessible to repository children.

**Exit:** local API drives an entire mocked run, then a genuine budgeted watsonx-powered run without original-branch changes.

### W7 — Broader scenarios and honest stability (J07, J08, J16, J17)

- [x] Preserve the original golden scenario and add a compatible pair with meaningful passing interaction coverage. The golden harness asserts frozen refs remain unchanged; the compatible-cart harness constructs actual sibling commits from one base, verifies their parents, merges them cleanly, and runs preserved base plus cross-feature coverage.
- [x] Add a second independently designed hidden collision: profile display-name updates versus cached reads. The harness proves sibling commits share one base, each branch and the combined existing suite pass, the interaction fails by assertion on stale data, and a revision-aware repair passes the byte-identical interaction test.
- [x] Keep expected-answer fixture documentation out of runtime investigation input. Reasoning context rejects `oracle`-classified entries, and every known-answer scenario/repair directory is explicitly labeled validation-only rather than model evidence.
- [x] Preserve actual generated tests and bounded command logs; do not present canned output as live discovery. Runtime execution records bind the test digest, while validation oracles remain explicitly labeled and separate from live/model evidence.
- [x] Add actual-execution coverage and a strict `failure-scenarios.json` record for invalid test, independent failure, textual conflict, timeout, and cancellation. Each case retains command results and stdout/stderr artifact paths; only assertion failures in the target interaction test can be collisions.
- [x] Exercise valid/no/invalid coupon boundaries, sequential same-key replay, different keys, no order mutation, and eight concurrent same-key requests against the same in-process store in the isolated repaired-checkout validation oracle.
- [x] Specify deterministic seeded schedules and boundary values in scenario code. The checkout matrix consumes `JOINTLY_SEED`, guarantees zero/one-cent, rounding, valid/invalid coupon, sequential/different-key/concurrent boundaries, and uses a deterministic PRNG to vary the remaining executed inputs.
- [x] Separate process repetition count, worker concurrency, and request concurrency in version-2 stability reports. Request concurrency is `null` unless the scenario explicitly declares it.
- [x] Preserve every iteration's scenario, derived seed, outcome, exit/timing data, bounded stdout/stderr artifacts, and optional execution fingerprint. The frozen checkout policy remains 50 process iterations, four workers, and base seed 20260926.
- [x] Isolate shared-state fixtures: each interaction-matrix case constructs a fresh in-process Fastify application/store, while the outer regression uses a unique temporary clone and does not write into the source checkout or shared run reports.

**Exit:** demonstrate repaired collision and compatible pair; second collision adds evidence of transfer. Report exactly which scenarios were exercised. Fifty repetitions alone never become “50 kinds of compatibility verified.”

### W8 — Dashboard, provenance, and onboarding (J18–J20, J25)

**Primary files:** dashboard `main.ts`, `dashboard.ts`, `passport.ts`, components, styles, tests.

- [x] Add explicit modes: sample demonstration, imported passport, and connected local investigation. Every rendered passport includes a mode/source banner, and mode navigation is explicit.
- [x] Static hosted mode explains import/local boundaries, labels the bundled passport historical, and never shows a nonfunctional Run button or substitutes sample success after an import/local failure.
- [ ] Local mode offers preflight, two refs/prompts, bounded run settings, start/cancel/resume, and requirement-resolution review. **Partial:** preflight, exact refs/prompts, and authenticated start/cancel/resume controls exist for the explicitly labeled simulation only; real-run settings and resolution review remain blocked.
- [ ] Show real backend stages and events. Use indeterminate progress where percentages cannot be measured; no fabricated countdown or progress. **Partial:** the connected-local view strictly parses and renders persisted simulation events in sequence order with no percentage or ETA; genuine deterministic/provider stages remain blocked.
- [x] Display source commits, schema version, generation time, scenario, verification scope, provenance, and stale/legacy/unverified status.
- [x] Validate nested imported fields, known verdicts, counts, dates, types, current-schema commit/prompt identity, and a one-MiB file/response limit. Preserve HTML escaping throughout.
- [x] Distinguish invalid input, unavailable backend, authentication failure, exhausted budget, failed test setup, actual collision, and interrupted run.
- [x] Render all supported verdicts consistently in web and exported HTML; unsafe/error verdicts must not use unconditional green styling.
- [x] Provide concise before/after evidence, changed requirement disclosure, full-test-source access, repair patch download, and evidence export.
- [x] Add authenticated, strictly validated frozen base/change commit and prompt details to connected-local mode without fetching or switching refs.
- [ ] Add guarded run controls and a clear How it works explanation for the completed investigation workflow after the driver and isolation gates pass.
- [x] Add HttpOnly same-origin browser-session bootstrap, confined built-dashboard serving, deterministic preflight, and read-only local run history. Keep browser run creation disabled until the deterministic driver and executor isolation are ready.
- [ ] Verify keyboard navigation, focus, readable status changes, mobile layout, and cancellation feedback. Reuse current Vite/TypeScript implementation. **Partial:** native controls, live status roles, post-update focus, responsive layouts, and simulation cancellation text are implemented; browser-level keyboard/screen-reader verification remains.

**Tests:** valid new/legacy imports, malformed nested structures, XSS-like strings, oversized files, unsupported verdict, sample provenance, streamed real status, local disconnect, failure does not display sample success. Add browser-level lifecycle testing where it verifies real interactions beyond string rendering.

**Exit:** a new user can distinguish viewing an example from running an investigation and can follow failure or success without reading raw logs.

### W9 — Measure impact and strengthen the pitch (J21, J25)

- [ ] Capture wall time to reproduce, diagnose, repair, and finish verification; count manual interventions and automated steps.
- [ ] Capture watsonx request/attempt IDs, reported usage/cost, tool calls, retries, and unavailable fields honestly. Keep runtime token usage and verified price estimates separate from development Bobcoins; mark unavailable billing data unavailable.
- [ ] Separate execution time from queue time, human decision waits, and cached results.
- [ ] Run a small documented manual comparison if claiming time saved. Record operator experience and timing method; one experiment is not a generalized benchmark.
- [ ] Report raw values if no valid comparison exists. Do not invent percentage savings, ROI, customers, revenue, or market validation.
- [ ] Position for teams using parallel AI coding agents and engineers reviewing interacting PRs. Any proposed pricing or business model is a hypothesis.
- [ ] Keep the pitch centered on Jointly generating the interaction test neither isolated change anticipated; show the watsonx runtime and actual Bob IDE development contribution accurately.

**Exit:** metrics can be traced to one complete archived run and the presentation distinguishes measured facts from expected benefits.

### W10 — Documentation, evidence, and submission (J22–J24)

- [ ] Update README, architecture, limitations, demo script, Windows guide, Bob setup, AGENTS status, and both implementation-status documents where necessary.
- [ ] Reconcile the older BUILD_GUIDE with the actual replay failure, changed requirement policy, runtime minimum, current milestone status, and new local automation.
- [x] Replace offline overclaims: installed deterministic tests/artifacts may run locally; live watsonx inference/authentication needs service connectivity. Dependency installation also may require network access.
- [x] Explain optional Shell use as development automation. Keep watsonx runtime access/quotas separate from Bob development credits; neither implies unlimited or enduring hackathon entitlement.
- [ ] Obtain or recreate a complete successful run, archive it with a manifest/checksum, and verify contents. Redact publication copies without overwriting original local evidence; identify omitted data explicitly.
- [ ] Record three fresh end-to-end application rehearsals and preserve real Bob IDE development evidence if feasible. This is the project's internal quality target, not an official event eligibility rule.
- [ ] Capture relevant real Bob IDE task-session summaries for every participating member under `bob_sessions/`; verify readability and provenance. Do not manufacture screenshot evidence.
- [ ] Complete the pending final submission-review screenshot after the actual review. Preserve the existing canonical naming map.
- [ ] Inventory and complete video, slides, cover, problem/solution statement, Bob usage statement, public repository, demo URL, and category/technology fields.
- [ ] Verify the public site and repository without requiring a private login when publication is authorized; verify Vercel's friendly alias serves the intended build.
- [ ] Recheck current official rules before submission; do not rely on stale planning durations.

Source status is recorded in Section 15. The official IBM guide directly verifies mandatory Bob IDE use, relevant task-session screenshots in `bob_sessions/`, optional Bob Shell, and optional watsonx.ai inference. The public event page currently verifies the event dates and 48-hour format but did not expose all detailed submission-field limits through the reviewed public response. Treat the three-minute/90-second video, MP4/narration, 500-word statements, slides, cover, application URL, and exact deadline as **platform-reported but pending final authenticated-platform confirmation**. The participant must record the final platform values and submission receipt before marking W10 complete.

Provisional recording outline, only if the final platform still confirms the reported three-minute/90-second limits: 0:00–0:20 problem; 0:20–0:40 inputs and passing existing suites; 0:40–1:25 watsonx intent/hypothesis/generated failure; 1:25–2:10 resolution and repair; 2:10–2:40 verification/passport; 2:40–3:00 measured impact and scope. Clearly disclose accelerated or edited long-running portions and use the actual corresponding artifacts.

**Exit:** submission claims match verifiable code/run evidence, the media meets event limits, and remaining external/operator dependencies are explicitly recorded rather than marked complete.

## 8. Milestone order and dependency gates

This is the sole authoritative dependency order. Completed foundation work remains completed even where independent packages were developed in parallel. Section 27 repeats the remaining order without rearranging it.

| Order | Milestone | Ownership and completion gate |
| --- | --- | --- |
| 1 | W0–W5 foundation and W7 deterministic fixtures | **Completed/partial as inventoried:** Node pin, classification, allowlisted child environment, evidence policy, setup, provider-independent reasoning/fake, and deterministic fixtures. Stronger executor isolation still gates generated-code execution. |
| 2 | Bob Task B1 real watsonx adapter | **Participant in Bob IDE; ready and not started.** Blocks only genuine watsonx calls and live workflows. Use the exact handoff and acceptance tests in `docs/bob-task-briefs.md`. |
| 3 | Independent W6/W8 and security work | **Codex may proceed in parallel:** shared deterministic orchestration, Bob/MCP regressions, website session/preflight/history/import/UI, executor isolation, hosted interfaces, and documentation. Do not implement B1 or claim B2. |
| 4 | Live provider capability gate | After B1, the operator separately authorizes the smallest real inference smoke check for the intended account/model/region. Mocked tests never close this gate. |
| 5 | Constrained H1 path W11–W17 | One approved synthetic public repository, one authorized operator, real watsonx inference, verified repair, and explicit approval before publishing one integration PR. Every endpoint still enforces authorization and run/artifact isolation. |
| 6 | Bob Task B2 integration review/debug | Participant in Bob IDE after both supported modes execute through the shared deterministic core. Concrete findings and resulting fixes/tests are required. This blocks final submission readiness, not earlier independent implementation. |
| 7 | W9/W10 proof, dual-workflow demo, and W18 evidence | Joint: measure the completed H1 path, demonstrate both supported workflows honestly, reconcile sources, archive authentic evidence, and complete participant-owned media/platform checks. |

W10 source inventory, hosted schemas, and external setup artifacts may proceed earlier when they do not bypass a prerequisite; W7 deterministic fixture preparation is already complete. Do not claim runtime inference complete if only fakes run. Do not delay deterministic fixes while waiting for Bob, accounts, or credentials.

### If hackathon time is short

Finish W1, the essential W2/W3 gates, and a real recorded workflow plus actual Bob IDE development evidence first. Attempt the smallest local watsonx inference vertical slice only if it can be tested before recording. Preserve the existing working IDE path as a truthful fallback. Defer run-history polish, the second collision, and additional integrations before cutting evidence integrity, generated-test proof, repair verification, or required submission media.

The hackathon target is intentionally narrow: one approved synthetic public repository, one authorized operator, genuine watsonx inference, a verified repair, and explicit approval before publishing one integration PR. Broader repositories, multiple operators, private code, automatic webhooks, generalized queues, and beta operations are later expansion. A local-only fallback or recorded replay must be labeled with its actual scope.

## 9. Verification matrix

| Case | Required result |
| --- | --- |
| Original coupon/retry before repair | Valid requirement-linked assertion failure; no premature safe verdict |
| Same run after accepted requirement resolution and repair | Original/generated tests unchanged and passing; complete policy; scoped safe passport |
| Compatible pair | No fabricated collision/patch; meaningful coverage and appropriate verdict |
| Second independent collision | watsonx-powered reasoning derives hypothesis without oracle hints; actual reproduction and repair evidence |
| Missing test runner / exit 127 | Environment failure, never confirmed collision |
| Syntax/import/setup error | Test-invalid, never confirmed collision |
| Zero/all-skipped tests | Insufficient verification |
| Timeout/signal/unknown failure | Non-safe explicit reason, child cleanup |
| Broken A or B | Independent failure; no repair disguised as cross-change discovery |
| Git conflict | Textual conflict distinct from semantic collision |
| Changed repair, test, prompt resolution, or policy | Prior downstream evidence invalidated |
| One absent contract or broken requirement link | Safe verdict rejected |
| Stability only 1/1 when policy requires 50 | Safe verdict rejected |
| Source refs or original assertions modified | Integrity failure; no safe passport |
| Invalid/expired/missing watsonx credential or unauthorized model | Actionable failure, no leaked credential or fake result |
| Model says success without required artifacts | Stage or verdict fails deterministically |
| Token/call/spend cap, cancel, restart | Persisted interrupted/failed state; bounded recovery |
| Untrusted origin/path or arbitrary command input | Request rejected before execution |
| Legacy/sample/imported passport | Correct provenance and validation; no invented verification |
| Clean clone on supported macOS/Windows setup | Documented install/build/test/preflight succeed |

Use Vitest for behavior tests, real temporary Git repositories for isolation/integration, and a fake inference transport for repeatable lifecycle/error testing. Run live watsonx checks separately with measured cost. Broaden test coverage for actual risks, not snapshots that merely restate implementation.

## 10. Operational and implementation cautions

- The orchestrator must not share a mutable active run between multiple writers; use execution IDs, a single writer/lock, and atomic state updates.
- A run directory is not an OS sandbox. State the trusted-repository boundary and avoid making claims of malicious-code containment.
- MCP path checks should use resolved/real paths where needed, not only reject literal `..` strings.
- Generated prompts/source are untrusted data; don't allow their contents to change backend command allowlists, filesystem roots, budgets, or run ownership.
- Do not silently install dependencies or execute new repository scripts just because the model requests it. Use the explicitly configured execution policy.
- Keep redaction consistent for retained logs, UI excerpts, SSE, metrics, errors, and exported bundles. Protect useful structured test data from being lost during redaction.
- Existing shared dependencies can compromise environment equivalence when branches change package requirements. Detect/report mismatches; use an explicit install strategy if supporting those cases.
- A successful patch application is not validation of behavior; tests must run against that actual resulting tree.
- Avoid model-specific HTTP integrations until IBM provides verified public endpoint/schema documentation appropriate to this account.

These are prospective controls required by the planned automation, not claims that all were previously reproduced as vulnerabilities.

## 11. Proposed file ownership map

| Area | Existing/proposed files |
| --- | --- |
| Runtime schemas and provenance | core `types.ts`, proposed `schemas.ts`, `provenance.ts`, evidence/manifest/passport modules |
| Structured test execution | core runner and proposed `test-adapters/vitest.ts`; generated/existing MCP tools |
| Setup | core CLI/config/ref modules; proposed `doctor.ts` and setup utilities |
| Provider inference | proposed `packages/watsonx-adapter/src/{client,auth,capabilities,usage,redaction}.ts` |
| Runtime reasoning | proposed `packages/reasoning/src/{stages,schemas,context,prompts}.ts` |
| Local lifecycle/API | proposed `packages/local-server/src/{server,runs,orchestrator,events,artifacts}.ts` |
| Shared orchestration | proposed `packages/orchestrator` extracted from local server when hosted mode is introduced |
| GitHub/API/auth | proposed `packages/github`, `packages/api` |
| Hosted execution | proposed `packages/worker`, `packages/sandbox` and runtime images |
| Hosted persistence | proposed `packages/storage` with local and hosted adapters; migrations |
| Deployment | proposed `deploy/`, documented secrets and environment templates |
| UI | existing dashboard entry, passport parser, components, styles; proposed run/setup views |
| Intent policy | `.bob` skills/rules/mode and resolution schema/UI |
| Broader fixtures | `scenarios/`, `examples/`, temporary-repository test builders |
| Documentation | README, AGENTS, BUILD_GUIDE, `docs/`, `bob_sessions/README.md` |

Prefer small focused changes: classification; schema/gates; requirement decisions; doctor; watsonx adapter; runtime stages; local API; dashboard; scenarios; metrics; submission docs. Commit/push only under the applicable user authorization. No destructive branch reset or fixture-ref rewriting is needed.

## 12. Definition of done

- [ ] Every P0 issue is fixed with regression coverage.
- [ ] Every P1 item is completed or explicitly deferred with reason; the overall plan remains incomplete if required work is deferred.
- [ ] Build and all tests pass on a documented supported runtime.
- [ ] Fresh-user setup works without author's machine paths or pre-existing local branch names.
- [ ] watsonx integration was verified against the SDK/API version, model, and actual account in a bounded run; W18 Bob IDE evidence is complete.
- [ ] Local dashboard starts an investigation and displays its actual final passport automatically.
- [ ] Source branches, existing assertions, and confirmed generated test are preserved.
- [ ] Requirement conflicts are transparent and authorized before safe certification.
- [ ] Compatible pair and expanded scenario coverage are demonstrated honestly.
- [ ] Provenance/staleness and malformed-input handling work across API, imports, and HTML exports.
- [ ] Cancellation, restart, missing credentials, and budget exhaustion have tested outcomes.
- [ ] Run metrics and a complete archive support presentation claims.
- [ ] Required submission assets and actual Bob IDE evidence are verified if hackathon submission remains in scope.
- [ ] Documentation distinguishes implemented, historical, proposed, and unsupported features.
- [ ] An authorized hosted user can connect an approved GitHub repository, select two PRs, run a real watsonx-powered investigation, and see the actual passport.
- [ ] PR head/base movement invalidates publication; cross-user/installation access is denied.
- [ ] Repository code cannot access GitHub/watsonx credentials or the control plane; worker budgets and cleanup are verified.
- [ ] A reviewed integration candidate is published once to a new branch/PR without moving either original head or target branch.
- [ ] Hosted restart, cancellation, artifact retention, installation removal, and token failures have tested outcomes. Webhook replay is required only when the P1 webhook inbox is implemented.
- [ ] Hosted release readiness is assessed separately from unrestricted-service readiness.

## 13. Progress log for the implementing chat

For each work package, append:

```text
Work package:
Status: pending / in progress / verified / blocked / deferred
Commit or changed files:
Behavior delivered:
Tests and live verification:
Evidence/run ID:
Remaining limitations or dependencies:
Next action:
```

Do not overwrite the dated baseline or historical run IDs to make them look newly verified.

## 14. Copyable prompt for the next chat

> Read revision 5 of `docs/improvement-implementation-plan.md`, `docs/implementation-inventory.md`, `AGENTS.md`, and the product documentation in `/Users/yeanul/Documents/ChatGPT/IBM/jointly`. Follow the single order in Section 8. Preserve the participant-owned B1 watsonx adapter and B2 integration review/debug tasks; do not implement or attribute them elsewhere. Implement the credential-safe deterministic core, shared Bob/MCP and website verification services, provider-independent contracts/fakes, orchestration, constrained H1 single-operator/synthetic-repository flow, tests, and documentation. Never treat mocks, screenshots, credentials, live deployment, or publication as completed without direct evidence and authorization. Keep secrets out of source/chat, preserve original branches, and record blockers without delaying independent work.

## 15. Official references and facts checked in this conversation

Documentation is version-sensitive. Recheck installed capabilities before coding against it. The Bob key/Shell references below apply to optional development tooling, not the hosted inference architecture.

- [IBM Bob API keys](https://bob.ibm.com/docs/shell/account/api-keys): keys exist; inference keys bind instance/team; general keys require additional team context for inference; supports automated authentication.
- [Bob Shell installation and authentication](https://bob.ibm.com/docs/shell/getting-started/install-and-setup): current English documentation uses `BOB_API_KEY`. Older/localized examples may differ; do not mix command generations.
- [Non-interactive Bob Shell](https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive): documents `bob run`, JSON/stream output, workspace/mode selection, resume, cost/turn limits, tool-group controls, and pre-approved tools. Capability verification is required.
- [Bob Shell](https://bob.ibm.com/docs/shell) and [Bob IDE](https://bob.ibm.com/docs/ide): product documentation entry points.
- [Official hackathon guide](https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html): directly verifies developer-workflow focus, real or sample projects, mandatory Bob IDE usage, relevant task-session screenshots under `bob_sessions/`, optional Shell, optional watsonx.ai inference, data restrictions, and Bobcoin constraints.
- [Public event page](https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon): directly verifies the September 25–27, 2026 dates and 48-hour format in the currently accessible response. Detailed submission fields and exact deadline were not visible in that reviewed response.
- **Participant final-platform check required:** while signed in, capture or transcribe the exact deadline/time zone, video duration and working-demo minimum, accepted file format/narration requirement, statement word limits, slides/cover/application URL fields, repository visibility requirement, team/participant fields, and final receipt/status. If the platform differs from this plan, the live platform controls; record the discrepancy rather than silently rewriting historical claims.

The Bob API-key dialog is not evidence of a supported Bob application inference API for this event. The organizer clarification directs runtime LLM use to watsonx.ai. Actual watsonx provisioning, model access, and credentials remain unverified.

## 16. Deferred roadmap

Keep these visible as future options, not prerequisites for this improvement pass:

- Automatic merge, branch-protection management, automatic textual-conflict repair, broad PR commenting, and continuous autonomous reruns on every GitHub event.
- Unrestricted anonymous execution, arbitrary ecosystems, arbitrary fork execution, and enterprise-scale multitenancy. GitHub PR import, isolated hosted workers, authenticated access, budgets, and explicit integration PR publication are now in scope below.
- More than two changes, additional language/test adapters, and dependency-isolated execution across heterogeneous projects.
- Shared organization run storage, analytics, historical collision patterns, enterprise policies, and ticket integrations.

The immediate product promise remains narrow: Jointly uses change intent to generate and verify cross-feature tests, and Jointly makes the resulting evidence inspectable and reproducible within the tested scope.

## 17. GitHub-connected hosted product architecture

### Delivery stages

| Release | Supported experience | Explicit boundary |
| --- | --- | --- |
| R1: Local foundation | Local repository, server-side watsonx adapter, browser-driven run, passport | W0–W10; local trusted environment |
| H1: Hosted hackathon release | One authorized operator, one approved synthetic public repository, two fixture PRs, genuine watsonx investigation, verified repair, explicit integration-PR approval | W11–W17 constrained profile; deny every other user/repository; one active job |
| P1: Post-hackathon expansion | Multiple authorized operators/installations and additional approved public repositories | Additional authorization, queue, webhook, operational, and retention work in Section 22 |
| P2: Restricted private-repository beta | Selected private repos after privacy, provider-processing, and stronger isolation review | Same supported language/test stack; not implied by H1/P1 |
| Future public service | Broader repository/organization support | Not implied by completing H1/P1/P2 |

H1 is a real hosted implementation, not a browser animation or a website secretly depending on the presenter's laptop. Provide a clearly labeled replay for outages, separate from the live path. Missing deployment credentials do not justify calling a local worker “hosted.” H1 may have exactly one authorized operator, but every endpoint must still deny all other identities and isolate that operator's runs/artifacts from public access.

### Hosted topology

```text
Browser on HTTPS
  ├─ login + selected repository/PR inputs
  ├─ live events, evidence and requirement decisions
  └─ explicit approval of candidate → publish request
               │
               ▼
Authenticated control-plane API
  ├─ GitHub App/user authorization and repository access policy
  ├─ frozen run inputs and durable orchestration state
  ├─ job lease / budget / cancellation / signed worker tickets
  ├─ private artifact access and audit records
  └─ isolated publisher (only component with write-capable GitHub token)
       │                   │                    │
       ▼                   ▼                    ▼
PostgreSQL             Object storage         GitHub API
metadata + jobs        private artifacts      PR inputs / approved output
       │
       ▼
Trusted stage orchestrator + watsonx inference service
  ├─ server-side IBM Cloud IAM credential; no GitHub write credential
  ├─ sanitized context; trusted Jointly mode/skills/configuration
  ├─ run-bound MCP operations with enforced paths/actions
  └─ launches short-lived repository execution sandbox
        ├─ Base / A / B / combined snapshots
        ├─ dependency install/build/test processes
        ├─ no inference/GitHub/storage credentials
        └─ CPU/memory/disk/time/network limits
```

Keep long-running orchestration/test workers off the static frontend host and outside request-response handlers. Hosting provider selection is an implementation-time decision based on verified long-running process, sandbox, networking, and persistence support. A frontend platform alone does not supply these capabilities.

Suggested starting stack: existing Vite frontend; TypeScript/Fastify API; managed PostgreSQL for authoritative run/job/approval metadata; private S3-compatible object storage; one Linux worker host able to create restricted execution environments. Use a database-backed lease initially rather than adding Redis by default. Local development keeps JSON/in-memory adapters. Record this extension after W0–W3 pass and reconcile `AGENTS.md`'s original in-memory MVP rule; do not retrofit a production database into the checkout sample.

### Four credential boundaries

1. **Control plane:** stores GitHub App signing material and auth/session state in a secret manager; validates who may access each repository.
2. **Fetcher:** receives only short-lived read access for the selected repository, acquires exact objects, then strips authentication/config before execution. Prefer a credential-free snapshot passed to the sandbox.
3. **Inference service:** alone receives the watsonx IAM credential and validates staged model outputs. Deterministic handlers delegate approved operations to credential-free sandboxes. Model output cannot directly execute commands or publish code.
4. **Publisher:** receives narrowly scoped write capability only for an approved candidate and never executes target repository scripts.

Do not mount host home directories, the Docker socket, cloud metadata access, Git credentials, or provider secrets into repository sandboxes. Merely removing a provider key from one environment variable is insufficient if repository code can inspect the inference service process, filesystem, or control socket.

## 18. Hosted work packages

### W11 — GitHub App, user identity, and repository access (J28)

**Proposed packages:** `packages/github`, `packages/api`.

- [ ] Register a GitHub App with selected-repository installation and callback configuration when the user authorizes account setup. Webhook configuration is P1 by default. Document setup using placeholders; no secrets in the plan or repository.
- [ ] Implement GitHub user sign-in with anti-CSRF state, server-side code exchange, secure HTTP-only session cookies, expiry/logout, and replay protection. Use the App's user authorization flow or a documented compatible session provider.
- [ ] Distinguish user authentication, GitHub App installation access, and actual user permission to the selected repository. An installation ID supplied by a client is not proof of any of these.
- [ ] Authorize every repository list, PR fetch, run, event stream, artifact download, resolution, and publication operation server-side. Public source does not make private run artifacts public automatically.
- [ ] H1 has exactly one configured authorized operator and one immutable allowlisted synthetic public repository ID. Deny every other authenticated or anonymous identity and every other repository; no anonymous Run endpoint charged to the owner's watsonx account.
- [ ] Use repository IDs as stable identities and resolve current names from GitHub; handle renamed/transferred/deleted repositories and revoked installations.
- [ ] Fetch bounded paginated repository/PR lists and expose permission errors distinctly from empty lists.
- [ ] Keep tokens server-side with bounded lifetime; handle expiry, revocation, rate limits, and permission changes. Reauthorize access at sensitive operations.
- [ ] H1 revalidates source refs directly at run and publication time; automatic webhook processing is deferred to P1. If a webhook endpoint is shipped early, signature validation, delivery deduplication, authorization, and a durable inbox are mandatory—an insecure partial endpoint must not be exposed.
- [ ] On uninstall/removal, block new operations, cancel affected pending execution, disable publication, and apply artifact access/retention policy.

Proposed minimum permission sets, to verify against the exact REST endpoints during implementation:

| Operation | Permission intent |
| --- | --- |
| Discover metadata and read selected code | Metadata read; Contents read |
| Read PR metadata | Pull requests read |
| Create new integration branch/commits and PR | Contents write; Pull requests write, publisher only |
| Optional pair-specific check | Checks write, only if this feature is implemented |
| Change workflows, admin settings, secrets, branch protection | Not requested/supported |

A GitHub App may be installed with publication permissions, but execution tokens must be reduced to read-only and the worker must never get a write token. If the operator only grants read access, analysis and patch download still work; publication is explicitly unavailable.

**Tests:** callback-state mismatch/replay; every non-allowlisted user denied; every non-allowlisted repository denied; forged installation/run ID; public access to private run/artifact denied; expired/revoked token; pagination; rate limit; removal during a run. Webhook tests are required only if the endpoint is implemented.

**Exit:** the backend exposes only repositories the signed-in user is authorized to analyze, and no browser or job payload contains provider credentials.

### W12 — Import PR pairs and freeze intent/revisions (J29)

**Primary areas:** GitHub adapter, core manifest/ref/config schemas, hosted input endpoints, dashboard PR form.

- [ ] Accept repository ID plus two distinct PR numbers, not arbitrary clone URLs or shell strings. Resolve URLs and Git objects through the trusted GitHub adapter.
- [ ] For H1, require the single allowlisted synthetic public repository, same target branch, open PRs, same-repository heads, and exactly one valid common base. Reject forks, submodules, Git LFS, unsupported dependency sources, and unresolved shallow history with a clear explanation until adapters exist.
- [ ] Record immutable repository/installation IDs; both PR numbers and head SHAs; common-base SHA; target branch and its current tip; merge order; original ref names; PR text snapshots; input timestamps; config and prompt hashes.
- [ ] H1's fixture requires the target tip to equal the approved common base. If branches diverged from an older base or target moved, report unsupported/stale inputs and request a new run. Do not claim proof for a different target tree.
- [ ] Fetch sufficient history to verify ancestry and exact objects, with size/depth/time bounds. Do not trust the GitHub mergeability label as semantic verification.
- [ ] Construct Base, Base+A, Base+B, Base+A+B deterministically from recorded commits. Persist resulting tree identities and distinguish Git/tool failure from a genuine textual conflict.
- [ ] Suggest PR titles/descriptions as initial intent text, but disclose the source. Let users attach/paste the original agent prompts or confirm requirements. Missing/weak intent becomes an ambiguity, not invented requirements.
- [ ] Never supply known expected-collision docs or existing expected answer artifacts to the model for the fresh investigation.
- [ ] Select supported execution profile from the repository/config reviewed at run creation. Do not accept arbitrary test commands directly from the browser; snapshot policy and disclose execution of repository code.
- [ ] Apply file/repository/download limits and safe checkout rules. Reject path escapes, external protocol redirects, symlinks escaping the sandbox, and target Git hooks/configuration.
- [ ] On PR synchronization, close, merge, or target movement, mark corresponding results outdated without rewriting historical evidence. Refresh GitHub directly before publication even if no webhook arrived.

**Tests:** identical PRs; wrong installation; mismatched targets; forks; moved heads/base; deleted PR; shallow ancestry; ambiguous merge base; malicious URL/ref/path; edited PR description; missing prompt; exact SHA replay.

**Exit:** every run is attributable to a precise pair and scope, and the same manifest reconstructs the same inputs without following moving branch names.

### W13 — Restricted hosted execution and model-action containment (J30)

**Proposed areas:** `packages/worker`, `packages/sandbox`, runtime image/build configuration.

- [ ] Implement a sandbox interface with create, stage files, run approved operation, inspect changes, collect outputs, cancel, and destroy. Use a local fake for tests and a real isolated runtime for hosted validation.
- [ ] H1: dedicated worker host with nonprivileged per-run containers, dropped capabilities, no privileged mounts, resource limits, denied internal/metadata egress, and no shared writable directories across jobs. Only the owned synthetic fixture repository is eligible. Do not label a default container configuration safe for arbitrary hostile repositories.
- [ ] P2: adopt a stronger isolation boundary such as per-run microVMs or a hardened sandbox runtime, with threat tests, before enabling external/private repository execution.
- [ ] Separate the inference supervisor from install/build/test sandboxes. Target package lifecycle scripts run only in those sandboxes and cannot read service environments or credentials.
- [ ] Load only trusted, versioned Jointly stage prompts, schemas, and operation policies from a dedicated supervisor workspace. Do not auto-load `.bob`, MCP definitions, hooks, or task instructions from an imported target repository.
- [ ] Treat PR text, source comments, test logs, and dependency output as data. Tool enforcement outside the model restricts run IDs, file paths, operations, credentials, and budgets even if the model follows injected instructions.
- [ ] Do not expose unrestricted shell execution to the model. Validate proposed file edits and dispatch only allowlisted, run-bound operations. Native provider tool calling is optional and requires model-specific capability tests; staged schema validation is the baseline.
- [ ] Use a tested package-install policy. H1 uses a pinned prebuilt dependency image for the approved fixture. P1/P2 may install inside a network-restricted sandbox using approved registry egress; stop if unsupported private packages require credentials.
- [ ] Disable network access during tests unless a declared supported scenario needs it; deny access to cloud metadata, control-plane/private networks, and other jobs in every phase.
- [ ] Configure wall-time, process-count, CPU, memory, disk, artifact size, output size, and inference spend limits. Enforce parent cancellation and kill descendants on failure.
- [ ] Keep source/input trees immutable, combined tree writable, logs separate, and ownership unique per job. Verify original snapshots and tests again when collecting results.
- [ ] Cleanup on success, crash, timeout, and cancellation; preserve only approved artifacts. Add expiry reaping for abandoned sandboxes.
- [ ] Verify watsonx runtime entitlement, model access, quotas, region, and data handling for the actual deployment account before release. Do not assume hackathon access permits an unlimited public service.

**Tests:** package script tries to read a seeded secret, reach metadata/control plane, write outside combined scope, load rogue MCP/hooks, fork processes, exhaust disk, or access another job. Fake secrets must remain inaccessible; real secrets must never be used in attack tests. Verify resource kill and cleanup.

**Exit:** a real restricted worker completes the sample without exposed credentials or host/source mutations. If policy cannot be enforced, hosted execution stays disabled; prompts are not a fallback security boundary.

### W14 — Durable hosted jobs, budgets, and evidence storage (J31)

**Proposed areas:** shared orchestrator, storage interfaces, PostgreSQL migrations, object-store adapter, worker lease API.

- [ ] Extract the deterministic stage state machine from local-server code so local and hosted modes share gate logic.
- [ ] Persist the authorized operator/installation binding, repository policy, runs, attempts, stages, events, artifact indexes, budgets, and publication approvals. Add the webhook inbox with P1 or earlier only if a webhook endpoint is fully implemented.
- [ ] Queue with transactional claim/lease, heartbeat, expiry, and a fencing token. Every write and stage completion must match the active lease; an old worker cannot overwrite a recovered run.
- [ ] Use bounded retries per failure class. Auth/policy/invalid-test failures are not blindly retried; budget accounting covers all attempts and resumes.
- [ ] Persist increasing event sequence numbers and serve authorized SSE with replay. Handle proxy timeout/disconnect without restarting a job.
- [ ] Upload artifacts atomically to private object storage with size, checksum, run/attempt ownership, and completed-upload status. Incomplete uploads never satisfy passport gates.
- [ ] Publish immutable result snapshots; mutable live state points to the latest validated snapshot. Keep historical failures instead of overwriting them.
- [ ] Enforce one active H1 job, a total/day spend cap, and a global operator kill switch. The single authorized operator does not remove the need for server-side identity checks on every run, event, artifact, resolution, and publication route. P1 adds generalized per-user/per-installation quota scheduling.
- [ ] Persist cancellation, authenticate worker messages, and reconcile jobs after API/worker restart. A cancelled lease cannot publish late success.
- [ ] Set explicit retention/expiry and deletion for workspaces, raw logs, artifacts, and retained inference context where controllable. Define backups and deletion behavior rather than silently retaining private code indefinitely.
- [ ] Serve private evidence through authorized API streaming or short-lived scoped download URLs; never public bucket URLs. Do not expose tokens, unrelated file paths, or raw sensitive logs through SSE.
- [ ] Record observed metrics from W9, including infrastructure timing separately from provider inference latency. Provide queue time, stage, and failure reason without invented ETAs.

**Tests:** double dispatch, lease takeover, late writes, partial uploads, malformed events, reconnect, restart, per-tenant access, exhausted quota, expired download, cancelled job completion, retention deletion.

**Exit:** a process restart cannot lose ownership/state or create duplicate publication; complete evidence is available only to authorized users.

### W15 — Exact candidate review and integration PR publication (J32)

**Primary areas:** `packages/github` publisher, core candidate schema, publication API, repair review UI.

- [ ] Build a candidate from the recorded common base plus both feature commits plus the verified repair and regression test. Use a new branch such as `jointly/integration/<run-id>`; never push to either original feature branch.
- [ ] Explain prominently that this is an integration PR containing A+B+repair, not a patch that can necessarily be merged independently of both features. Do not automatically close, merge, or alter the selected PRs.
- [ ] Freeze a candidate tree/commit identity and patch hash. Verify the candidate represents the exact tested production tree and regression tests. If packaging adds or changes behavior/configuration, rerun affected verification first.
- [ ] Display target repository/base, both input PRs/SHAs, full changes, requirement decisions, verification scope, remaining warnings, and publication action before approval.
- [ ] Store approval bound to user, repository, target/base SHA, both head SHAs, candidate tree/patch hash, and artifact snapshot. Any change invalidates it.
- [ ] Reauthorize the user's write permission and installation scope. Re-fetch PR heads, target tip, open state, and required access immediately before publication; reject stale candidates and request revalidation.
- [ ] Publish through a credential-separated service. Create only the new branch and a draft integration PR by default. Do not disable protection or change repository settings.
- [ ] Make publication idempotent. A repeated click/network retry returns the already-created branch/PR; reconcile remote state after partial failure before retrying. Never force-push an unrelated existing branch with the same name.
- [ ] Never let the model choose arbitrary publication destinations, branch names, or body actions. Generate the destination from validated records; derive a factual PR body with links to the protected evidence and clear tested scope.
- [ ] Restrict `.github/workflows`, credential files, and other privileged paths in the initial supported profile; don't request workflow-write permissions as a shortcut. Review CI triggers that a new branch/PR can cause before the sample publication.
- [ ] Prefer patch download if write access is unavailable or a candidate has unresolved issues. Never publish a repair marked verified when gates failed.
- [ ] Store the created PR URL and candidate identity. In a Codex implementation chat, attach any PR created for that chat with the app artifact tool as required.

Race boundary: GitHub operations across two source PRs and a target branch are not one transaction. After creation, recheck refs and attach a visible stale warning/invalidation if they moved during publication. Never claim the candidate certifies future target state. Keep auto-merge off.

**Tests:** approval for wrong candidate; source/target drift; removed installation; user lost write access; original branches unchanged; exact candidate tree mismatch; duplicate publish; branch name collision; branch created but PR call failed; ambiguous timeout reconciled; privileged path denied.

**Exit:** a real approved fixture run produces one reviewable integration PR whose tree matches the verified candidate, while both original PR head SHAs and target branch stay unchanged.

### W16 — Complete constrained GitHub web experience (J33)

**Primary areas:** existing dashboard extended with mode-aware hosted views and shared API client.

- [ ] Add hosted sign-in, verify the one allowlisted operator, expose only the one allowlisted synthetic repository, and provide a clear requested-access explanation. General installation/repository selection is P1.
- [ ] Provide sample-demo entry without implying sample playback is a live run. Public visitors may view a sanitized replay; only the approved authenticated operator can launch H1 jobs.
- [ ] Show two selectable PRs with target, head revision, and compatibility status; explain unsupported forks/base relationships before starting.
- [ ] Prefill intent from PR text, show its provenance, accept original prompts, and confirm ambiguity rather than inventing missing instructions.
- [ ] Display supported commands/profile, what code is sent to watsonx.ai, limits, and private/public visibility when meaningful to the user's decision.
- [ ] Start via an idempotent request, follow queue/stages/cancellation/resume, and open the genuine result automatically.
- [ ] Preserve W8's nested schema validation, XSS escaping, accessibility, error distinctions, and sample/import/local provenance.
- [ ] Add requirement-resolution actions, evidence scope, source drift alerts, candidate diff, approval, and integration PR link. Disable Publish when access/staleness/gates fail, and enforce the same rules on the server.
- [ ] Show code/log excerpts with download access, not unlimited log walls. Avoid leaking private repository names/results into public landing pages or telemetry.
- [ ] Display local history separately from hosted account history; logout clears cached private views and reconnect reauthorizes event streams.
- [ ] Rework How it works around connect → select → investigate → verify → review/publish. Clearly explain semantic versus textual merge issues.

**Tests:** full hosted journey with a fake backend, installation denial, missing write scope, PR drift, session expiry, retry without duplicate run, private artifact access, cancelled/failed run, successful publication, keyboard/mobile usability.

**Exit:** an unfamiliar user can complete the supported workflow entirely through the website after account setup, without copying prompts between multiple chats or manually importing the final passport.

### W17 — Deployment, live validation, and release controls (J34)

- [ ] Select and document a provider topology supporting a long-lived API, durable database/artifacts, and the chosen worker isolation. Verify actual provider limits before implementation; do not assume a frontend deployment supplies isolated code execution.
- [ ] Add reproducible runtime/container definitions with pinned supported Node/SDK versions, runtime image, API version, and model identifier, environment templates, database migrations, health/readiness checks, and deployment/rollback instructions.
- [ ] Configure separate dev/staging/production secrets and GitHub callback URLs; add webhook URLs only when P1 webhook support is implemented. Redact build/runtime logs. No live private key in image layers.
- [ ] Use HTTPS, explicit frontend/API origins, secure session settings, artifact access checks, worker credentials, and egress rules. Keep the worker job endpoint inaccessible to arbitrary clients.
- [ ] Record availability of watsonx service connectivity, IAM authentication, and model access inside the actual hosted runtime. A laptop smoke test is insufficient.
- [ ] Run a fresh approved-repository investigation on the hosted deployment: frozen PR selection, real watsonx requests and deterministic operation evidence, generated failure, authorized requirement decision, repair, full verification, passport, and approved integration PR.
- [ ] Run the compatible pair and a controlled failure/cancellation scenario remotely. Exercise API restart/worker interruption and verify evidence recovery without extra publication.
- [ ] Verify public landing/replay and authorized private execution separately, including Vercel alias/build identity if that frontend host is retained.
- [ ] Measure wall time, manual interventions, runtime tokens, queue/worker time, and infrastructure usage; keep development Bobcoins separate. Set spending ceilings and stop policies before inviting testers.
- [x] Produce an H1 operational runbook for bad keys, quota exhaustion, stale source refs, stuck worker, lost lease, failed publication, and evidence deletion. Add webhook failure handling with P1.
- [ ] Display H1 scope honestly; never advertise “any GitHub repository” when only the pinned synthetic repository works.
- [ ] Finish W10's event-compliant media with real hosted footage. Include IDE usage evidence even when the visible runtime uses watsonx.ai.

**Exit:** deployed end-to-end behavior, failure recovery, and scope are demonstrated and recorded; mocks remain clearly identified as tests.

## 19. Hosted API and data contracts

All endpoints below are proposed, versioned under `/api/v1`, and authenticated except the login/callback and explicitly public sanitized sample endpoint. Installation/repository/run IDs are selectors, never authorization proofs. Do not expose provider secrets to the browser. H1 may implement only the subset needed for the one-operator/one-repository journey; deferred endpoints must return unavailable/not found and must not exist as unsecured stubs. Webhook intake is P1 unless implemented completely with signature validation and a durable inbox.

| Endpoint | Contract |
| --- | --- |
| `GET /auth/github/start` | Begin sign-in using server-issued state |
| `GET /auth/github/callback` | Validate/exchange callback, establish session |
| `POST /auth/logout` | Revoke local session and clear private client state |
| `GET /me` | User identity, supported capabilities, effective limits |
| `GET /github/installations` | Installations available to this user |
| `GET /github/installations/:id/repositories` | Authorized, paginated selected repositories |
| `GET /github/repositories/:id/pulls` | Bounded candidate PR list |
| `POST /run-previews` | Resolve/freeze candidate inputs, execution profile, limits, intent source; no job execution |
| `POST /runs` | Start the approved preview with idempotency key; recheck drift/access; return 202 and run ID |
| `GET /runs` | Paginated account-authorized history |
| `GET /runs/:id` | Current lifecycle, verified snapshot, provenance, staleness, and actions allowed |
| `GET /runs/:id/events?after=<sequence>` | Authorized resumable SSE; no sensitive raw streams |
| `POST /runs/:id/cancel` | Persist idempotent cancellation |
| `POST /runs/:id/resume` | Revalidate and enqueue only allowed incomplete work |
| `POST /runs/:id/resolutions` | Record explicit intent decision and invalidate downstream evidence as needed |
| `GET /runs/:id/candidate` | Exact verified tree/patch and reviewable publication target |
| `POST /runs/:id/publication-approvals` | Bind user's consent to exact candidate and source versions |
| `POST /runs/:id/publish` | Idempotent authorized publication using the bound approval |
| `GET /runs/:id/passport` | Validated current or explicitly historical passport |
| `GET /runs/:id/artifacts/:id` | Authorized artifact stream/download |
| `DELETE /runs/:id` | Cancel if needed and apply documented deletion/retention policy |
| `POST /webhooks/github` | **P1 by default:** signature-verified delivery inbox; no direct execution |

Return typed error codes such as `UNAUTHORIZED`, `REPOSITORY_NOT_ALLOWED`, `UNSUPPORTED_INPUTS`, `INPUTS_STALE`, `BUDGET_EXCEEDED`, `INFERENCE_AUTH_FAILED`, `VERIFICATION_INCOMPLETE`, and `PUBLICATION_STALE`. Use request IDs in logs; never echo credentials or full private source in errors.

### Core hosted records

- **Repository binding:** tenant/operator identity, installation ID, immutable repo ID, access policy, execution-profile ID, visibility, last verification.
- **Run inputs:** user, repo, both PR numbers/head SHAs, target tip, merge base, merge order, intent/invariant snapshots, execution profile, versions, config/lock hashes, approved data handling and budget.
- **Job attempt:** run ID, attempt number, lease/fencing token, worker identity, stage, heartbeat, cancellation, start/end, termination reason, aggregate spend.
- **Artifact:** owner/run/attempt, type, schema version, object key, checksum, size, visibility, created/expires timestamps, upload completion.
- **Event:** run/attempt, sequence, timestamp, type, redacted payload, source stage. Events report activity; artifacts establish proof.
- **Candidate:** input manifest digest, pre-repair combined tree, verified output tree, patch/regression-test hashes, passport snapshot, required resolutions, publication target.
- **Publication approval:** approving user, candidate digest, source refs, target tip, issued/expiry time, scope, consumed/revoked status.
- **Publication result:** idempotency key, candidate digest, remote branch/commit/PR identity, status, partial-failure reconciliation, stale-after-publication state.
- **Webhook inbox:** delivery ID, validated event type, installation/repo identity, received time, processing state, digest, bounded retained payload.

Use tenant-bound uniqueness and authorization checks; guess-resistant IDs alone do not prevent cross-tenant access. Do not store raw keys in these records. Validate workers' artifact ownership and candidate fingerprints centrally before approving publication.

## 20. Git semantics, staleness, and PR output policy

### What the new PR contains

```text
Frozen common base / target tip
    ├── selected PR A head
    └── selected PR B head
             │ deterministic recorded integration order
             ▼
       combined pre-repair tree
             │ watsonx-proposed isolated repair + regression test
             ▼
       verified candidate tree
             │ user reviews and explicitly approves
             ▼
       new integration branch → draft PR against original target
```

Do not create a PR containing only the repair against main if main lacks A and B; that patch may not apply or have meaning independently. Do not rebase/squash/reconstruct the candidate after verification without validating resulting tree identity and rerunning affected checks. Preserve both original source PRs and explain the intended integration strategy in the new PR body.

Every report distinguishes the snapshot that was tested from current GitHub state. If either head, target tip, intent snapshot, or accepted requirement decision changes, publication is stale. A rerun creates a new attempt/version; it does not edit historical proof into a new claim.

The optional GitHub check feature must describe the **pair and candidate** explicitly. A green check attached to one PR does not certify it against every other branch. For H1, website evidence plus the draft PR is sufficient; checks/comments are optional and must not become an accidental auto-merge gate.

### Dependency and workflow changes

H1 supports the constrained synthetic sample with known commands/dependencies. Reject unsupported lockfile/toolchain differences rather than sharing one installed dependency tree and claiming environment equivalence. A future supported profile must install each variant's declared dependency set in isolation and record its identity. Reject privileged workflow changes initially; do not add workflow permissions to make an unsafe publication succeed.

### Future normalization of divergent bases

Supporting PRs whose merge base differs from the target tip requires explicit normalization: build each variant from the frozen target, apply only the intended feature delta with conflict handling, freeze the resulting commits/trees, and rerun all four matrices. This is separate work, not an implicit extension of the strict H1 common-base model. Document it before expanding eligibility.

## 21. Hosted verification and operational acceptance

Add these to Section 9's complete local/core verification matrix:

| Case | Required outcome |
| --- | --- |
| Real GitHub pair on approved repository | Frozen exact inputs; actual watsonx-powered run; verifiable artifacts |
| User guesses another installation/run/artifact ID | Access denied on every API/SSE/download route |
| GitHub App removed mid-run | No new access/publication; cancellation and retention policy applied |
| Invalid/duplicate/reordered webhook, when P1 endpoint exists | Invalid rejected; duplicate idempotent; state reconciled from authoritative revisions |
| Source PR or base moves after preview | Run start/publication rejected or explicitly stale |
| Source moves in publication race | Post-publication staleness recorded; no auto-merge or universal safety claim |
| Fork or unsupported dependency/toolchain | Clear unsupported result before executing unapproved code |
| Malicious repository Bob config/hooks | Not loaded into supervisor; policies unchanged |
| Install/test script requests credentials or metadata | Access denied by isolation/network boundary |
| Repository tries to modify original snapshots | Blocked or integrity failure; no safe passport |
| Worker crashes, lease expires, old worker returns | Fenced writes rejected; bounded safe recovery |
| Event stream disconnects | Job continues; replay resumes without duplicated actions |
| Partial object-store upload | Artifact unavailable for gates until complete and verified |
| Budget exhausted across resumes | Stop at aggregate cap; no credit-reset loophole |
| Publish clicked twice / request times out | One integration PR; remote state reconciled before retry |
| Publish with changed/unapproved candidate | Rejected |
| Lack of Contents/PR write permission | Investigation works; publication unavailable; patch download allowed |
| Candidate altered by commit/export packaging | Verification invalidated or proven same tested tree |
| New PR creation triggers CI | Expected approved workflow only; no broadened privileged path support |
| Retention expiry / user deletion | Private artifacts removed per policy, access revoked, jobs cleaned |
| Hosted demo outage | Labeled archived replay; no simulated progress presented as live |

### Test layers and release evidence

1. Unit: schemas, state transitions, permissions, fingerprints, parser, and budget math.
2. Integration: temporary Git histories, fixture execution, object-store/database adapters, leases, publisher idempotency, fake provider errors.
3. Browser: GitHub selection through reviewed publication with stubbed provider APIs, plus accessibility/error flows.
4. Security boundary: controlled scripts attempting filesystem/network/credential escapes using fake secrets and isolated test infrastructure.
5. Live staging: installed GitHub App, actual watsonx credential and remote worker, two real sample PRs, fresh generated test and repair, complete passport, explicit draft integration PR.
6. Release: a second user permission check, compatible pair, failure/cancellation, restart recovery, and a retained audit bundle.

Keep paid/network live checks out of routine unit tests. No new exact test-count target: demonstrate behavioral coverage and a clean full build/test run. Include OS coverage for local setup and Linux coverage for the deployed worker.

### Initial deployment defaults to configure and measure

- H1: one active investigation, one authorized operator, one approved synthetic public repository.
- Per-run wall time, Inference token/spend cap, turn cap, output/artifact size, CPU, RAM, disk, and process count must be configured explicitly; choose values from measured fixture runs with headroom.
- Enforce global daily spend/concurrency limits and an operator stop switch before public demonstrations.
- Start with short-lived workspace cleanup after artifacts are safely stored; specify separate artifact/log retention in the UI/docs.
- H1 has no automatic paid webhook reruns. If P1 webhooks are added, use them for invalidation; users still start runs explicitly.

Acceptance requires verifying limits, not only adding configuration fields.

## 22. Scope gates and complete delivery checklist

### R1 — local foundation complete

- [ ] W0–W9 local functionality and honest evidence are verified; W10 documentation progresses alongside implementation, with final submission assets completed for the chosen release.
- [ ] Known false classification fixed; current source/tests/config bound to verdict.
- [ ] Real watsonx integration and supported local setup demonstrated; substantive Bob IDE development evidence recorded.

### H1 — complete hosted hackathon release

- [ ] The constrained portions of W11–W17 are completed on an actual deployment, not only mocks/local execution; deferred P1/P2 features are labeled.
- [ ] The single approved operator signs in and can access only the one approved synthetic public repository; every other identity/repository is denied.
- [ ] Two PRs are frozen, intent confirmed, and unsupported inputs rejected clearly.
- [ ] Actual isolated worker performs watsonx-powered investigation and automatic proposed repair.
- [ ] Website displays genuine progress, before/after evidence, requirement decisions, scope, and metrics.
- [ ] Human approval publishes exactly one new draft integration PR; originals and target are unchanged.
- [ ] Compatible-pair and controlled failure/cancellation paths pass.
- [ ] Credential boundaries, budgets, authorization, staleness, recovery, and cleanup are verified.
- [ ] Documentation and public messaging say “approved repositories / supported stack” rather than “any repository.”
- [ ] Required hackathon media/evidence is completed and traced to the real deployed run.

### P1/P2 — post-hackathon expansion gates

- [ ] Preserve the authorization and run/artifact isolation already required by H1 while adding multiple authorized users/installations; add cross-tenant tests before exposing each new surface.
- [ ] Demonstrate stronger sandbox isolation for externally supplied repositories.
- [ ] Publish private-code data flow, retention, deletion, and provider-processing information; verify account entitlements for this use.
- [ ] Test repository transfer/removal, member access loss, quota exhaustion, and private artifact access.
- [ ] Define supported lockfile/install profiles; explicitly reject unsupported private dependencies/forks rather than guessing.
- [ ] Add limited invitations, quota controls, operational support, and abuse monitoring before expanding access.
- [ ] Obtain feedback from real users; record usability outcomes without claiming statistical validation from a small sample.

A complete H1 implementation is the hackathon target. P1/P2 explain the broader roadmap without making production-scale hosting, multi-user operation, webhooks, private repositories, or hostile-code execution prerequisites for the submission.

### Dependencies the next chat must surface early

| Dependency | Why needed | Independent work while unavailable |
| --- | --- | --- |
| GitHub App registration and installation authorization | Real repo access and publication | Adapter mocks, schemas, auth boundaries, fixture Git tests |
| IBM Cloud credential, authorized watsonx model/project, and runtime entitlement | Live AI reasoning on worker | Inference adapter tests and all deterministic fixes |
| Hosting/database/object-store credentials and budget | Actual remote run and persistence | Container/runtime definitions, local compose/testing, deployment docs |
| Two suitable sample PRs and approved target repo | Demonstrate exact GitHub flow | Prepare fixture branches/tests and reviewed PR content locally |
| Operator requirement decision | Resolve materially conflicting intent | Produce reviewable resolution proposal; continue independent checks |
| Real Bob IDE session evidence and recording | Event submission | Finish docs, scripts, asset inventory, and verified software |

Prepare concrete reviewable setup and deployment artifacts before asking for external actions. Never paste actual keys into the implementation chat.

## 23. Additional primary references and architecture decisions

These sources were checked while preparing revision 2. They substantiate provider interfaces, not the custom architecture proposed above. Recheck endpoint permissions and installed-version compatibility during implementation.

- [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation): installation tokens can be restricted to repositories/permissions and have limited lifetime. Use them server-side.
- [Choosing GitHub App permissions](https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/choosing-permissions-for-a-github-app): implementation reference for permission design; verify exact endpoints before requesting scopes.
- [GitHub pull request API](https://docs.github.com/en/rest/pulls/pulls): PR input retrieval and explicit output PR creation.
- [Validating GitHub webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries): verify delivery signatures before trusting payloads.
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks): asynchronous handling and delivery identifiers inform the inbox design.
- [GitHub check runs](https://docs.github.com/en/rest/checks/runs): optional status integration only; avoid suggesting a single-head check proves all pair combinations.
- [Bob Shell non-interactive sessions](https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive): optional development scripting only in this revision; the hosted app uses the documented watsonx API.

Record these implementation decisions in short architecture notes before merging the relevant changes:

1. Local versus hosted persistence and job leasing, including the original MVP constraint change.
2. Strict two-PR/common-base eligibility and the meaning of the output integration PR.
3. Structured test classification, evidence fingerprints, and scoped verdict policy.
4. Credential-separated inference supervision and repository execution containment.
5. GitHub authorization, user approval binding, and idempotent publication.
6. H1 synthetic-repository boundary, private-code exclusion, and conditions for P1/P2 expansion.

## 24. Honest hackathon assessment of the implemented idea

**Conditional assessment: approximately 8.5/10 if the H1 experience works reliably, the original evidence bugs are fixed, and the final presentation demonstrates it clearly.** This is an evaluator's estimate, not an official score, guarantee, or comparison against unseen competitors. The reviewed current implementation remains approximately 7.5/10; writing this plan does not raise its delivered score.

| Criterion | Conditional score | Why it improves / what still limits it |
| --- | ---: | --- |
| Application of Technology | 9/10 | Real watsonx-powered investigation with demonstrated Bob IDE development, tools, isolated execution, and a verified GitHub output; must prove actual execution and integrity |
| Presentation | 8.5/10 | Connect → select PRs → observe failure → repair → review PR is easy to follow; slow setup, opaque waits, or sample-only footage would reduce it |
| Business Value | 8/10 | Integrates with a recognizable review workflow and reduces manual handoffs; still needs measured savings and broader user evidence |
| Originality | 8.5/10 | Prompt-aware cross-PR testing plus a reproducible repair is differentiated; GitHub login and automated fixes alone are not the innovation |

Simple equal-weight average: 8.5/10. Official numerical weights were not published in the event criteria checked in this conversation. The format above is a transparent personal rubric.

Strongest demonstrated story: two real PRs and their existing tests look healthy; watsonx-powered reasoning derives the missing cross-feature test from intent, exposes a hidden behavioral conflict, repairs it in isolation, and supplies a reviewable integration PR backed by evidence. This also makes the website a working control interface instead of only a result viewer.

Remaining reasons not to score it 10/10:

- A prepared example can still hide how much guidance was supplied; show fresh generation and a compatible/second scenario.
- Repeated passes do not prove all semantic behavior, and explicit requirement conflicts require a defensible decision.
- Execution isolation, evidence integrity, and source-drift handling are central product quality, not optional polish.
- A smooth demo does not establish adoption or economic value. Measure one workflow honestly.
- The final video/slides and actual competing submissions remain unknown.

My recommendation is to pursue H1. If time is limited, a reliable single synthetic-repository workflow with a real generated test and repair is stronger than a broad “any repository” promise with incomplete execution. Do not spend all remaining time building P1/P2 infrastructure at the expense of the core proof.


## 25. Eligibility audit and submission gate

**Decision as of 2026-09-27:** proceed with this revision. The architecture is consistent with the published guide and the organizer statement supplied by the user. This is a compatibility assessment, not a certification that the team meets every prize condition. A working website can automate GitHub investigation and repair while Bob IDE remains a core development tool. watsonx.ai supplies the runtime inference.

The [official guide](https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html) explicitly permits watsonx.ai for agent inference and requires Bob IDE as a core component. The verified organizer screenshot clarifies the same division. Do not claim the website calls a Bob API, or interpret the API-key UI as overriding that clarification.

| Check | Current assessment | Required before submission |
| --- | --- | --- |
| Developer-workflow problem | Fits the described event focus | Demonstrate a real integration defect and reviewable repair |
| Bob IDE central contribution | Existing integration/history reported; final revised-build evidence incomplete | Execute W18 and retain authentic development evidence |
| watsonx application inference | Explicitly supported by guide | Verify actual account/model access and show genuine runtime evidence |
| Website/GitHub automation | No prohibition found in reviewed event material; compatible design inference | Respect repository authorization and provider/platform conditions |
| Team/participant registration | Not verified by this review | Check platform registration, team roster, account requirements, and submission owner |
| Originality and licensing | Requires final audit | Identify prior work, dependencies, assets, licenses, and participant contributions accurately; check the event's original-work/MIT requirements and third-party compatibility |
| Data restrictions | Supported by using synthetic/authorized sample code | Exclude prohibited datasets and confidential/client/personal/social-media data from the hackathon inputs and artifacts |
| Submission assets and timing | Pending final inventory | Complete W10 and confirm platform receipt by its displayed deadline |
| Full participation/prize terms | Not fully verified; terms page was not readable through the retrieval used | Participant must review current applicable terms and any organizer eligibility conditions; do not mark this row passed without evidence |
| Prize outcome | Cannot be promised | Eligibility and judging are separate; submission does not guarantee selection |

A previously inspected platform view reportedly listed a September 27, 2026, 11:00 a.m. Eastern deadline (15:00 UTC / 21:00 Bangladesh time for that date), but the currently accessible public event response did not expose that exact time. The participant must verify the signed-in live platform deadline and submission receipt; this document cannot establish whether a submission was accepted. Required and uncertain materials are summarized in W10/Section 15. Treat any feedback-reward program as separate from the main judged prize.

Use an owned, synthetic demonstration repository with appropriate licensing. Public visibility alone does not make all repository data suitable under the guide. Keep GitHub authentication/profile/commit-author information out of model contexts and public evidence unless necessary and permitted; redact operational identifiers from demo artifacts. Private-repository beta support is future product scope and does not relax event data restrictions.

**Submission gate:** W10 and W18 evidence must be complete, all applicable rows must have a named owner and recorded outcome, and remaining uncertainty must be stated honestly. If runtime access is unavailable, present only the functioning scope with its actual provider and evidence. A local Bob IDE demonstration is a fallback, not completion of the promised hosted watsonx workflow.

## 26. W18 — Reserved substantive Bob IDE development and evidence

**Issue:** J35. **Priority:** P0 for submission. **Owner:** the participating developer using their actual Bob IDE account. This planning document, deterministic core work, classification fix, credential policy, provider-independent contracts/fakes, and other Codex-authored changes must not be attributed to Bob.

Two tasks are reserved and described in full in `docs/bob-task-briefs.md`:

1. **B1 — Real watsonx adapter implementation.** Dependency: W5 provider-independent interface, schemas, fake transport, configuration contract, and acceptance tests are ready. Deliver the real SDK/REST transport, bounded retry/auth/cancellation/error mapping, sanitized provider metadata, and passing contract tests. Live credential smoke testing is an external validation sub-gate and must remain incomplete until actually run.
2. **B2 — Shared-workflow integration review and debugging.** Dependency: the website path and preserved Bob IDE + MCP path both execute through the shared deterministic core. Bob must inspect and exercise classification, credential isolation, evidence/staleness gates, generated-test preservation, and publication safety; record concrete findings; implement or direct substantive fixes; and add or improve regression tests. A generic summary with no findings, diff, or tests does not satisfy B2.

B1 blocks genuine watsonx execution but does not block fake-backed orchestration, UI, deterministic fixes, or hosted interface preparation. B2 blocks final submission-readiness claims but does not block earlier independent implementation. A screenshot after the fact cannot retroactively make Bob responsible for code it did not help develop.

- [x] Create `docs/bob-development-evidence.md` with pending B1/B2 evidence fields; task completion remains unchecked until authentic sessions, diffs, and tests are linked.
- [ ] Execute B1 in Bob IDE from the prepared brief; retain the task session summary and accurately attribute the resulting files/commits.
- [ ] Execute B2 in Bob IDE after both workflows are integrated; retain findings, fixes, regression evidence, and the task session summary.
- [ ] Save relevant authentic task-session screenshots under `bob_sessions/`; verify readability and absence of secrets or unnecessary personal information.
- [ ] Distinguish developer contribution evidence from runtime request logs and test artifacts.
- [ ] Preserve historical Bob-generated passports with original provenance; label new watsonx runs with their actual provider/model.
- [ ] Write the required Bob usage statement from completed evidence, within the official length limit.
- [ ] Include concise Bob IDE development evidence in the recording/slides while satisfying the final platform-confirmed duration and working-solution-footage limits; the currently reported three-minute/90-second values remain pending that check.
- [ ] Ensure README, demo labels, pitch, and screenshots all describe the same architecture: built/improved with Bob IDE; runtime investigation powered by watsonx.ai.
- [ ] Check all required participant evidence and final submission assets before marking the hackathon submission ready.

**Exit:** meaningful Bob contributions are traceable to the delivered implementation, authentic screenshots are available, and provider attribution is consistent. W18 is not satisfied by this checklist alone.

## 27. Runtime contracts, migration, and validation

### A. Shared reasoning contract

Implement a provider-independent internal boundary so the deterministic core never depends on SDK response shapes. The sole runtime provider in this delivery is watsonx.ai; abstraction is for testing and contract stability, not an unannounced provider fallback.

Proposed `ReasoningRequest` fields: `runId`, `attemptId`, `stage`, `schemaVersion`, frozen input digest, prompt-template version, bounded context references, model configuration, deadline, and remaining budget. The trusted orchestrator selects stage/configuration; repository text cannot override them.

Proposed `ReasoningResult` fields: stage-specific validated payload, provider/model identity, available provider request ID, finish reason, reported token usage, measured latency, attempt count, and sanitized diagnostics. Missing provider metadata is explicitly unavailable. Do not invent chain-of-thought records; store concise requested rationales and source references.

Proposed file changes contain a normalized repository-relative path, expected prior content digest (or explicit new-file marker), proposed replacement content, and rationale. The deterministic handler checks path containment, symlinks, file allowlists, byte limits, stale content, and stage permissions before applying. Full replacement content is acceptable for the narrow demo; if using patches, reject ambiguous application. Never apply provider output directly through a shell command.

### B. Stage contracts and authoritative outcomes

| Stage | Input | Model proposal | Deterministic authority |
| --- | --- | --- | --- |
| Extract intent A/B independently | Each frozen PR's relevant diff, user intent, bounded base context | Requirements, evidence references, uncertainties | Validate references/schema and preserve separate input provenance |
| Find interaction | Both intent records and relevant frozen code | Potential shared invariant and falsifiable scenario | Candidate hypothesis only, not confirmed collision |
| Generate test | Hypothesis and trusted execution profile | Allowed test-file changes and expected observations | Install test into designated fixture; execute required comparison matrix |
| Diagnose | Sanitized runner results and assertion evidence | Interpretation and proposed requirement decision | Runner classification determines observed failure; unresolved policy goes to user |
| Repair | Approved decision, relevant code, preserved test | Scoped code changes | Apply only in isolated combined workspace; enforce patch boundaries |
| Review | Candidate diff and fresh verification context | Concise risks and evidence-linked assessment | Advisory review; cannot override failing/missing verification |
| Report | Validated manifest and results | Human-readable explanation | Counts/verdicts/provenance derive from validated records, not prose |

Reject malformed or unsupported outputs without advancing state. A bounded formatting correction may fit within the configured inference retry budget; it must not silently increase the global cap. Provider/model feature support must be verified. Do not require native tool calling or JSON enforcement on a model that lacks it; application-side schema validation is always required. Unknown assertions, missing context, or truncation may yield a useful incomplete report, never an invented success.

### C. Provider implementation and configuration

Use the [official Node SDK](https://ibm.github.io/watsonx-ai-node-sdk/) or the documented REST interface, with IBM Cloud IAM authentication according to the [credentials documentation](https://www.ibm.com/docs/en/watsonx/saas?topic=resources-credentials-programmatic-access). Verify installed SDK signatures against its version. [Text chat parameters](https://ibm.github.io/watsonx-ai-node-sdk/interfaces/1_7_x.WatsonXAI.TextChatParams.html) expose model/context configuration and optional capabilities; availability differs by model.

- Keep IAM credentials in server-side secret configuration, never browser bundles, target workspaces, passports, or logs. Refresh IAM tokens through supported authentication code.
- Configure the actual service URL/region, API version, model ID, and authorized project or supported space. Do not assume a particular model or free quota exists for the account.
- Probe a small synthetic request and validate the required stage format before a full run. Record access failure clearly and continue offline development independently.
- Use cancellation/deadline controls; distinguish invalid credentials, unavailable model, rate limit, provider outage, malformed/truncated response, and exhausted budget.
- Use bounded backoff only for retryable errors. Track aggregate attempts across restarts, including requests that may have incurred cost before interruption.
- Record model configuration and prompt/context digests for reproducibility. A fixed seed or low temperature is not proof of deterministic inference.
- Keep model-facing context minimal and sanitized. Exclude hidden expected-answer fixtures, credentials, private operational metadata, and unsupported data.

### D. Migration checklist and order

Follow Section 8 exactly:

1. Treat the inventoried W0–W5 foundation and W7 deterministic fixtures as the completed/partial baseline. Keep the stronger W1/W6/W13 executor-isolation gate closed before any model-generated repository code executes.
2. The participant performs B1 in Bob IDE to implement the real watsonx adapter. In parallel, Codex may implement only independent W6/W8 orchestration, Bob/MCP compatibility, website, isolation, hosted-interface, fixture, and documentation work.
3. Preserve provider/model/template provenance and old sample/passport history without relabeling Bob artifacts as watsonx runs. Both workflows must use shared deterministic services and retain regression coverage.
4. After B1, separately authorize and validate the smallest live account/model/region capability check; then complete the constrained H1 W11–W17 vertical slice for one approved synthetic repository and one authorized operator.
5. After both workflows are wired, the participant performs B2 in Bob IDE. Concrete findings, fixes, tests, and authentic session evidence are required.
6. Complete W9/W10 proof, demonstrate both workflows, freeze the exact candidate, collect authentic W18 evidence, and perform the final signed-in submission checks.

### E. Runtime acceptance matrix

| Test | Passing evidence |
| --- | --- |
| Mocked valid stage sequence | State advances only after schema and deterministic gate success |
| Bad JSON/unknown field/path escape/stale digest | Rejected without unauthorized filesystem changes |
| Fake model claim that tests passed | Cannot alter authoritative runner results or verdict |
| IAM/model/quota error | Specific sanitized failure; no fake passport success |
| Provider timeout or cancellation | No further edits/publication; termination state and partial evidence retained |
| Restart during inference | Durable attempt accounting and no duplicate publication |
| Compatible change pair | No collision invented to satisfy the demo narrative |
| Known interaction scenario, fresh model run | Generated test reproduces the interaction, requirement decision is recorded, repair verifies |
| Live deployment account | Genuine watsonx metadata plus independently captured test artifacts; mocks clearly separated |
| Development attribution | Actual Bob IDE sessions map to core changes and required submission evidence |

**Final delivery:** working scoped website → authorized GitHub selection → watsonx-powered investigation/repair → verified results and exact diff → explicit publication approval → new integration PR. Automatic investigation and code preparation are central; automatic merging into the original branches is excluded. Ambiguous requirements stop for a decision, failed checks remain visible, and the interface never equates a proposed repair with a proven universal fix.
