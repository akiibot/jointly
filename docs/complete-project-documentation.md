# Jointly — Complete Project Documentation

**Product:** Jointly
**Category:** Intent-aware pre-merge verification for parallel AI-generated changes
**Hackathon:** IBM Bob 2.0 Hackathon
**Current delivery:** local IBM Bob IDE + MCP workflow, deterministic verification core, evidence dashboard, provider contracts, and an offline-tested watsonx.ai adapter
**Runtime:** Node.js 22.19.x, TypeScript, npm workspaces, Vitest
**Repository:** `https://github.com/akiibot/jointly`
**Recording tag:** `hackathon-recording-v1`
**Documentation date:** 2026-09-27, Asia/Dhaka

This is the current consolidated project handbook. It describes what Jointly is, why it exists, how every major subsystem works, what is genuinely implemented, what is simulated, what remains unverified, how to operate the project, and how contributions are attributed. When this document conflicts with an actual runtime result, the runtime evidence and current source code take precedence. When submission rules change, the signed-in submission platform takes precedence.

---

## Table of contents

1. Executive summary
2. Problem and product thesis
3. Product promise and non-claims
4. Users and use cases
5. Current implementation status
6. Golden checkout demonstration
7. Core operating principles
8. System architecture
9. End-to-end workflow
10. IBM Bob IDE workflow
11. MCP server and tools
12. Deterministic core
13. Git and workspace isolation
14. Command execution and test classification
15. Evidence, provenance, and fingerprints
16. Intent, hypotheses, and requirement resolution
17. Repair and verification
18. Stability verification
19. Merge Safety Passport
20. Dashboard
21. Local website service
22. Provider-independent reasoning system
23. watsonx.ai adapter
24. Configuration
25. Repository and package structure
26. Artifact layout
27. Security model
28. Installation and setup
29. Command reference
30. Complete Bob-assisted run procedure
31. Testing and verified metrics
32. Failure handling and troubleshooting
33. Contribution and authorship record
34. Demonstration and pitch guidance
35. Limitations
36. Roadmap
37. Release and submission checklist
38. Glossary
39. Reference documents

---

## 1. Executive summary

Jointly detects behavioral collisions between two independently developed changes that Git and existing tests can miss.

The central failure mode is simple:

```text
Change A alone                         PASS
Change B alone                         PASS
A + B textual merge                    CLEAN
A + B existing tests                   PASS
Generated cross-change interaction     FAIL
```

Two changes can be individually correct while relying on incompatible assumptions about shared state, business rules, APIs, or side effects. Git detects overlapping text. Traditional CI runs tests that someone already anticipated. Jointly focuses on the missing interaction.

Jointly combines bounded AI reasoning with deterministic verification:

- IBM Bob proposes intent contracts, risky interactions, focused tests, diagnoses, and repairs in the supported IDE workflow.
- A provider-independent reasoning interface prepares the same bounded responsibilities for a future website workflow using watsonx.ai.
- Jointly's deterministic core owns Git identity, isolated workspaces, command execution, artifacts, classification, stability, and verdict gates.
- AI output is never accepted as proof merely because a model produced it.
- A safe result is tied to exact inputs and persisted as a Merge Safety Passport.

The current hackathon product is the working IBM Bob IDE + MCP flow over the approved checkout fixture. The website currently provides evidence viewing, passport import, deterministic preflight, and an explicitly simulated local lifecycle. The real watsonx transport exists and passes offline/mocked contract tests, but live provider access and end-to-end website orchestration have not been validated.

### One-sentence pitch

> Jointly catches semantic collisions between parallel AI-generated changes by generating the interaction test nobody wrote, verifying an isolated repair, and issuing an evidence-backed Merge Safety Passport.

### Tagline

> Evidence before merge.

### Closing line

> Before AI code meets production, make the interaction prove itself.

---

## 2. Problem and product thesis

AI coding systems make parallel implementation inexpensive. They do not automatically make parallel integration safe.

Each agent typically reasons from:

- one task or prompt;
- one branch or working copy;
- one subset of repository context;
- its own tests;
- its own assumptions about shared behavior.

The collision appears only after changes meet:

```text
Prompt A → Agent A → Change A ─┐
                               ├─ Combined behavior violates intent
Prompt B → Agent B → Change B ─┘
```

Typical collision categories include:

- **State collisions:** two changes interpret or mutate the same state differently.
- **Contract collisions:** one change alters the meaning or lifecycle of an API used by another.
- **Temporal collisions:** failure depends on ordering, retry, timeout, or concurrency.
- **Side-effect collisions:** the combination duplicates a payment, message, reservation, or mutation.
- **Authorization collisions:** two independently added paths apply inconsistent access rules.
- **Data-lifecycle collisions:** one change invalidates, caches, migrates, or finalizes data another expects to remain mutable.
- **Intent collisions:** the code runs but violates one of the original tasks.

The product thesis is that the missing artifact is often an executable interaction test derived from both change intents. Jointly turns that hypothesis into evidence and refuses to equate model confidence with merge safety.

---

## 3. Product promise and non-claims

### Jointly promises

- to freeze one common base and exactly two changes;
- to verify each change and the combination in isolated workspaces;
- to preserve source branches unchanged;
- to record evidence rather than rely on conversational memory;
- to distinguish real assertion failures from invalid tests or infrastructure failures;
- to bind safe verdicts to exact inputs, tests, repairs, and stability evidence;
- to make incomplete evidence visible instead of silently producing success.

### Jointly does not claim

- universal semantic correctness;
- detection of every possible interaction;
- production-grade hostile-code sandboxing;
- support for arbitrary languages or build systems;
- automatic merging;
- a completed hosted multi-user service;
- live watsonx.ai inference in the current demonstration;
- GitHub App installation or successful integration-PR publication;
- customer adoption, revenue, time savings, or defect-reduction percentages.

The correct current claim is:

> Jointly demonstrates that intent-aware executable interaction testing can expose a real semantic collision that clean merging, independent tests, and the existing combined suite miss.

---

## 4. Users and use cases

### Primary users

- engineering teams using multiple coding agents;
- teams developing features in parallel branches;
- integration reviewers;
- platform teams responsible for AI-assisted development controls;
- technical leads who need reviewable evidence rather than an AI confidence score.

### Primary use case

An operator selects two changes from one common base, supplies their prompts, and asks Jointly whether the combination preserves both intents.

### Secondary use cases

- regression investigation between two human-authored branches;
- requirement-aware integration testing;
- audit evidence for a manually approved integration candidate;
- identification of missing cross-feature tests;
- repeatability checks for a repaired interaction.

---

## 5. Current implementation status

The following table is the authoritative capability boundary for the hackathon build.

| Capability | Status | Meaning |
| --- | --- | --- |
| Checkout collision fixture | Implemented | Two frozen branches reproduce a known semantic collision. |
| Four-workspace Git isolation | Implemented | Base, change A, change B, and combined are prepared without switching the developer checkout. |
| Existing-test execution | Implemented | Allowlisted configured commands produce structured results and artifacts. |
| Generated-test classification | Implemented | Assertion collisions are distinguished from invalid/setup/environmental failures. |
| Evidence and provenance core | Implemented | Versioned artifacts, hashes, fingerprints, and verification gates exist. |
| Repair patch export | Implemented | Only combined-workspace modifications are exported. |
| Stability matrix | Implemented | Bounded repeated execution uses a fixed seed strategy. |
| Merge Safety Passport | Implemented | JSON and HTML are assembled only from persisted evidence. |
| IBM Bob mode and five Skills | Implemented and supported | Bob is the working reasoning interface for the current demo. |
| Nine MCP tools | Implemented and tested | Bob invokes deterministic repository operations through local STDIO. |
| Evidence dashboard | Implemented | Presents sample, imported, and connected-local evidence without analysis logic. |
| Provider-independent reasoning contracts | Implemented | Seven bounded reasoning stages with strict schemas and budgets. |
| watsonx.ai transport | Implemented, live-unverified | IBM SDK transport passes mocked/offline tests; live access has not been tested. |
| Local website lifecycle | Partial, simulated | Authenticated checkpoint/event/cancel/resume lifecycle; no real inference or generated-code execution. |
| Credential-separated child environment | Partial | Environment allowlisting exists; hostile-code filesystem/process/network isolation does not. |
| Hosted authentication and cross-user isolation | Policy foundation only | Pure policy tests exist; no deployed hosted identity or storage. |
| GitHub PR selection/publication | Policy foundation only | Candidate approval rules exist; no GitHub App or published integration PR. |
| Live hosted watsonx workflow | Not complete | Roadmap only. |

---

## 6. Golden checkout demonstration

### Frozen inputs

| Input | Ref | Commit |
| --- | --- | --- |
| Common base tag | `jointly-demo-base` | `57ffb46eebbddcdf7f3c93953556b02bf7892711` |
| Coupon change | `origin/agent/coupon` | `2b8990f3e149c9752cbad2423c6f705ff42fe1ed` |
| Payment retry change | `origin/agent/payment-retry` | `2d12dbbd6ec875ed535308a8a6f3494bb3bc1257` |

`jointly-demo-base` is an annotated tag whose target commit is `57ffb46...`, which is also the two feature branches' merge base. Git may display the annotated tag object's own ID in some plumbing commands; run evidence records the dereferenced commit identity. Operators must use the configuration and doctor output rather than shorten or guess hashes.

### Change A: percentage coupons

The coupon branch adds percentage discounts applied before tax. For four items at 1,000 cents each and coupon `SAVE10`:

```text
subtotal       4000
discount        400
tax             360
total          3960
```

The coupon-aware invariant is:

```text
total = subtotal - discountAmount + tax
```

### Change B: idempotent payment retries

The payment-retry branch records and reuses the result of the same logical payment key. It also validates a base-era financial identity:

```text
total = subtotal + tax
```

That assumption is valid before coupons exist but incompatible with a discounted finalized order.

### Reproduction sequence

1. Create an order.
2. Add four items at 1,000 cents each.
3. Apply `SAVE10`.
4. Finalize checkout.
5. Make the first payment with an idempotency key.
6. Replay payment using the same order and key.

### Observed collision

- The first payment succeeds for 3,960 cents.
- The same-key replay returns HTTP 400.
- Expected behavior is HTTP 201 with the original successful payment.
- No duplicate payment is created.
- The finalized order is not mutated.
- The idempotent replay contract still fails because the original result is not returned.

### Why ordinary checks miss it

- no textual merge conflict;
- both feature branches pass independently;
- existing tests pass after combining the branches;
- coupon tests do not exercise keyed replay;
- retry tests do not exercise discounted orders.

### Requirement conflict

The original payment formula and coupon-aware formula cannot both apply unchanged to discounted orders. `scenarios/checkout/proposed-requirement-resolution.json` preserves the original statements and proposes the combined formula, but an authorized operator must accept it or cite an existing precedence rule before certifying the repaired pair.

---

## 7. Core operating principles

1. **Two changes only.** The MVP requires exactly two changes from one common base.
2. **Never switch the developer checkout.** Investigation uses isolated workspaces.
3. **Never mutate source branches.** The original refs are read-only inputs.
4. **Repair the combined candidate only.** Neither individual branch is rewritten.
5. **Allowlisted commands only.** Prompt input cannot supply arbitrary shell commands.
6. **AI proposes; deterministic execution decides.** Model output is a candidate, not proof.
7. **Invalid tests are not collisions.** Compilation, import, setup, zero-test, skipped-only, timeout, cancellation, and environmental failures receive explicit classifications.
8. **Persist before presenting.** The dashboard renders validated artifacts; it performs no investigation.
9. **A safe verdict is scoped.** It applies only to exact commits, configuration, candidate state, and executed evidence.
10. **Honest capability labels are mandatory.** Sample, imported, simulated, offline-tested, and live states must not be confused.

---

## 8. System architecture

```text
Original prompts + exact Git refs
               │
               ├───────────────────────────────────────────────┐
               │                                               │
               ▼                                               ▼
 IBM Bob IDE + 5 Skills                            Website reasoning boundary
               │                                  watsonx.ai transport exists
               │ nine typed MCP calls              live orchestration incomplete
               ▼                                               │
       Jointly MCP server                                      │
               └──────────────────────┬────────────────────────┘
                                      ▼
                      Shared deterministic core
            Git identity · workspaces · commands · evidence
            classification · patch · stability · verdict gates
                                      │
                                      ▼
                          runs/<run-id>/ artifacts
                                      │
                                      ▼
                         passport.json / passport.html
                                      │
                                      ▼
                         Presentation-only dashboard
```

### Responsibility boundary

| Concern | Bob or reasoning provider | Jointly deterministic core |
| --- | --- | --- |
| Interpret prompts | Proposes | Validates schema and evidence links |
| Identify risky interaction | Proposes | Records bounded hypotheses |
| Write interaction test | Proposes source | Controls path and executes it |
| Diagnose failure | Proposes explanation | Requires matching execution and requirement evidence |
| Suggest repair | Proposes bounded files | Applies only to isolated candidate and hashes result |
| Run Git or shell commands | No direct authority | Yes, through configuration and allowlists |
| Decide final safe verdict | No | Yes, through evidence gates |

---

## 9. End-to-end workflow

```text
1. Validate runtime and configuration
2. Register frozen inputs
3. Prepare four isolated workspaces
4. Run existing tests in all workspaces
5. Extract two intent contracts
6. Discover shared interaction surfaces
7. Rank collision hypotheses
8. Generate a focused interaction test
9. Run and classify the before-repair test
10. Persist a requirement-linked diagnosis
11. Resolve true requirement ambiguity with authority
12. Propose and apply a combined-workspace repair
13. Export the exact patch
14. Rerun the unchanged generated test
15. Rerun all existing tests
16. Review the repair against fresh evidence
17. Run the stability matrix
18. Collect and validate evidence
19. Generate the scoped passport
20. Present the passport in the dashboard
```

Any stage may stop with a non-safe outcome. Stopping honestly is valid behavior.

---

## 10. IBM Bob IDE workflow

### Custom mode

The Bob custom-mode slug is:

```text
ai-merge-investigator
```

Configuration lives in:

```text
.bob/custom_modes.yaml
.bob/rules-ai-merge-investigator/
```

The rules cover investigation boundaries, test generation, repair policy, and evidence requirements.

### Five project Skills

| Skill | Responsibility | Supporting material |
| --- | --- | --- |
| `extract-intent-contract` | Convert a change prompt and diff into observable requirements. | `intent-schema.json` |
| `discover-interactions` | Find shared files, symbols, state, side effects, APIs, and domain concepts. | `collision-checklist.md` |
| `generate-interaction-tests` | Produce a focused executable test linked to one hypothesis. | `test-quality-checklist.md` |
| `repair-collision` | Propose the smallest combined-candidate repair preserving authorized requirements. | `repair-policy.md` |
| `generate-merge-passport` | Summarize only persisted evidence and request a supported verdict. | `passport-template.md` |

### Local Bob connection

Bob connects to the MCP server through a machine-specific ignored file:

```text
.bob/mcp.json
```

It is created or proposed by:

```bash
npm run jointly -- setup
```

The portable shape is:

```json
{
  "mcpServers": {
    "jointly": {
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"],
      "cwd": "/absolute/path/to/jointly"
    }
  }
}
```

`setup` cannot prove Bob loaded the mode or tools. The operator must reload Bob and manually confirm five Skills and nine MCP tools.

---

## 11. MCP server and tools

The MCP package uses `@modelcontextprotocol/sdk` over local STDIO. Zod validates every tool request before it reaches the deterministic core.

| Tool | Inputs | Result and safety behavior |
| --- | --- | --- |
| `register_run` | base ref and exactly two changes with prompt paths | Resolves Git identities and creates a manifest. |
| `prepare_workspaces` | run ID | Creates base, A, B, combined workspaces; reports textual conflict with files. |
| `read_change_diff` | run ID and change ID | Returns bounded/redacted diff evidence for the registered change. |
| `run_existing_tests` | run ID, workspace, optional evidence phase | Runs only configured commands and records structured counts. |
| `run_generated_test` | run ID, test path, hypothesis, requirement IDs, expected result, phase | Executes and classifies the interaction test. |
| `run_stability_matrix` | run ID, bounded iterations/concurrency/seed | Repeats the configured scenario; maximum request values are enforced. |
| `collect_evidence` | run ID, phase, verification basis | Validates required artifacts and derives requirement links from evidence. |
| `export_resolution_patch` | run ID | Exports uncommitted combined-workspace changes as a reviewable patch. |
| `generate_passport` | run ID, supported verdict, summary, basis | Assembles JSON and HTML only after gate evaluation. |

Supported passport verdicts are:

```text
SAFE_TO_MERGE
COLLISION_CONFIRMED
REPAIR_REQUIRES_REVIEW
INDEPENDENT_CHANGE_FAILED
TEXTUAL_CONFLICT
INSUFFICIENT_EVIDENCE
```

---

## 12. Deterministic core

`@jointly/core` is the authority for repository state and evidence. Its major modules are:

| Module | Responsibility |
| --- | --- |
| `config.ts` | Parse and validate `jointly.yaml`; enforce exactly two changes and safe relative paths. |
| `doctor.ts` | Check Node, Git, npm, dependencies, config, refs, prompts, build output, and provider-variable presence without printing secrets. |
| `manifest.ts` | Create run IDs, freeze commits/trees/prompts/configuration, and persist the manifest. |
| `git.ts` | Resolve refs, inspect ancestry/trees, and perform bounded Git operations. |
| `workspace.ts` | Build four isolated workspace trees and detect textual conflicts. |
| `runner.ts` | Execute configured commands with deadlines, signals, logs, and environment policy. |
| `vitest-report.ts` | Parse structured Vitest JSON, counts, and failure categories. |
| `execution-records.ts` | Bind command results to fingerprints and before/after phases. |
| `changes.ts` | Validate and read registered change data and bounded diffs. |
| `schemas.ts` | Define Zod artifact schemas and cross-field rules. |
| `provenance.ts` | Verify that source inputs, prompts, trees, and config remain unchanged. |
| `evidence.ts` | Read/write validated relative artifacts and requirement links. |
| `stability.ts` | Coordinate deterministic repeated execution and persist iteration evidence. |
| `passport.ts` | Evaluate gates and assemble the final passport. |
| `failure-scenarios.ts` | Record controlled conflict, independent failure, invalid test, timeout, and cancellation evidence. |
| `hosted-policy.ts` | Pure future-hosting policies for ownership, authorization, approval, staleness, and publication idempotency. |
| `cli.ts` | Expose `doctor`, `setup`, and `analyze`. |

---

## 13. Git and workspace isolation

Every investigation uses four workspaces:

| Workspace | Contents | Purpose |
| --- | --- | --- |
| `base` | common base | prove baseline health |
| `change-a` | base plus change A | verify A independently |
| `change-b` | base plus change B | verify B independently |
| `combined` | base plus A plus B | expose interaction and contain repair |

The `WorkspaceName` type also recognizes `repaired` for evidence semantics, but the persisted preparation record contains the four principal workspaces.

Jointly records resolved commits and, when available, trees. It never treats a branch name alone as immutable evidence. Repairs and generated tests are intentionally uncommitted inside the combined workspace. The operator must not switch to or commit on the feature branches during an investigation.

---

## 14. Command execution and test classification

### Command source

Commands come from `jointly.yaml`, not from Bob prompts or model output. The checkout configuration currently declares build, existing-test, structured report, interaction-test, and interaction-report commands.

### Command result

Each `CommandResult` records:

- command ID and workspace;
- actual configured command;
- exit code;
- timeout and termination reason;
- signal when relevant;
- duration;
- stdout/stderr artifact paths;
- environment-policy version and allowed names;
- structured test counts;
- report artifact or parsing error.

### Collision classifications

| Classification | Meaning |
| --- | --- |
| `confirmed-collision` | A valid executed interaction test produced the expected meaningful failure tied to the hypothesis. |
| `hypothesis-rejected` | The valid interaction test passed; after repair this is the expected outcome. |
| `test-invalid` | Compilation, import, syntax, configuration, zero-test, or otherwise invalid test evidence. |
| `environment-failure` | Infrastructure or execution environment prevented a meaningful test. |
| `insufficient-evidence` | Available output cannot support a stronger classification. |

Timeouts, cancellations, spawn errors, signals, and unstructured or missing test reports are kept explicit. A nonzero process exit by itself is never enough to prove a semantic collision.

---

## 15. Evidence, provenance, and fingerprints

Jointly uses evidence as a graph of bound artifacts rather than a collection of screenshots.

### Frozen provenance

A run manifest may contain:

- run ID and creation time;
- repository root;
- base ref, commit, and tree;
- two change IDs, refs, commits, trees, prompt paths, and prompt digests;
- command configuration;
- stability configuration;
- full validated configuration snapshot and digest.

### Execution fingerprints

An execution fingerprint binds a result to:

- run ID;
- base and change identities;
- prompt digests;
- configuration digest;
- workspace and workspace state digest;
- command digest;
- environment-policy digest;
- generated-test source digest;
- test-report digest;
- intent-contract digest;
- hypotheses digest;
- requirement-resolution digest;
- repair-candidate digest;
- one final combined inputs digest.

Changing the candidate, test, prompt, requirement decision, or configuration invalidates stale evidence rather than silently reusing it.

### Artifact safety

Artifact paths must be run-relative and may not be absolute or contain `..`. JSON artifacts are schema-validated where consumed. The dashboard imposes a one-megabyte passport limit and bounds nested strings and record counts.

---

## 16. Intent, hypotheses, and requirement resolution

### Intent contracts

Each change receives one `IntentContract` with:

- change ID;
- goal;
- typed requirements;
- entities;
- side effects;
- ambiguities.

Each requirement includes:

- unique ID;
- statement;
- type: business rule, invariant, negative case, security, or compatibility;
- involved entities;
- side effects;
- observable outcome;
- source file/excerpt or bounded provider citation;
- optional assumptions.

### Interaction surfaces

Surfaces can represent files, symbols, APIs, databases, events, state, side effects, or domain concepts. The checkout collision is a domain/state interaction around `Order.total`.

### Collision hypotheses

A hypothesis binds:

- two change IDs;
- one or more requirement IDs;
- shared surfaces;
- explanation and risk;
- an executable scenario;
- optionally explicit conflicting requirements.

### Requirement resolutions

If requirements truly conflict, Jointly must not rewrite them invisibly. A `RequirementResolution` preserves original statements, decision, rationale, affected tests, and authority.

Allowed decisions are:

```text
accepted-replacement
preserve-both
unresolved
```

A resolved conflict requires recorded authority from an operator or a supplied precedence rule. An unresolved conflict cannot support a safe repaired verdict.

---

## 17. Repair and verification

The repair stage follows these rules:

1. Use only the isolated combined workspace.
2. Preserve authorized requirements from both changes.
3. Modify the smallest practical set of files.
4. Bind every file change to an expected prior digest or `NEW_FILE`.
5. Export an exact patch and repair summary.
6. Preserve the before-repair test artifact and digest.
7. Rerun the same test after repair.
8. Rerun existing tests in all required workspaces.
9. Bind a fresh repair review to the exact verification context.

A passing replacement test is not acceptable if the test was weakened, changed, or disconnected from the original hypothesis.

### Verification bases

- `repaired-collision`: a valid collision was confirmed, repaired, and retested.
- `compatible-pair`: a valid focused interaction test passed and the changes were compatible without repair.

The evidence required for these bases differs; a compatible pair must not invent a repair, and a repaired collision must preserve before/after proof.

---

## 18. Stability verification

The default checkout stability configuration is:

```yaml
iterations: 50
concurrency: 4
seed: 20260926
```

The seed strategy is `base-plus-iteration-minus-one`. Stability records distinguish:

- process iterations;
- worker concurrency;
- request concurrency, when known;
- per-iteration seed;
- outcome, exit code, timeout, and duration;
- stdout/stderr and execution artifacts;
- the full execution fingerprint for every iteration.

For a safe verdict, all configured iterations must pass, none may time out, and every fingerprint must remain bound to the same run, candidate, generated test, requirements, and repair.

---

## 19. Merge Safety Passport

`passport.json` is the machine-readable source of truth. `passport.html` is a human-readable export.

### Passport contents

- schema version, run ID, generation time, and summary;
- exact changes and prompt paths;
- input-integrity result;
- verification basis;
- intent contracts and requirements;
- interaction hypotheses;
- before/after existing-test evidence;
- before/after collision evidence;
- runtime diagnosis;
- requirement decisions;
- repair patch and summary;
- repair-review evidence;
- stability result;
- evidence summary;
- verdict and explicit gate failures.

### Safe-verdict gate

For a repaired collision, `SAFE_TO_MERGE` requires at minimum:

- valid frozen input integrity;
- exactly two complete intent contracts;
- linked requirement and hypothesis evidence;
- passing nonzero existing-test results for base, A, B, and combined;
- valid execution fingerprints for the current workspace states;
- a before-repair `confirmed-collision` result;
- a matching runtime diagnosis;
- authorized resolution for any genuine requirement conflict;
- a real exported repair patch and metadata;
- an unchanged generated test that passes after repair;
- passing fresh regressions;
- a complete zero-failure stability matrix;
- a fresh approving repair review bound to the exact context;
- no missing required artifact.

The passport is scoped evidence, not a universal guarantee and not permission to merge automatically.

---

## 20. Dashboard

The dashboard is deliberately presentation-only. It parses and validates passport data but does not perform intent analysis, run tests, propose repairs, or decide verdicts.

### Five evidence views

1. **Overview:** exact changes, refs, commits, and test matrix.
2. **Intent:** goals, requirements, entities, side effects, and shared surfaces.
3. **Investigation:** hypothesis, generated test, expected/observed behavior, and classification.
4. **Repair:** patch, summary, requirement decisions, and before/after evidence.
5. **Passport:** final scoped verdict, stability, and gate status.

### Modes

| Mode | Meaning |
| --- | --- |
| `sample` | Historical bundled evidence for demonstration; nothing is running. |
| `imported` | A user-selected or explicit passport URL; no analysis occurs. |
| `connected-local` | Status and artifacts from the loopback local service; never falls back to sample success. |

Current-schema passports require structured verification gates. Older records are labeled `legacy-unverified`; they are not silently upgraded.

The parser validates exactly two changes, supported verdicts, full commit IDs for current passports, bounded nested structures, consistent stability totals, and safe-verdict gate coherence.

---

## 21. Local website service

`@jointly/local-server` is a Fastify service bound to loopback. It serves the built dashboard and a local API.

### Security properties

- binds to `127.0.0.1` by default;
- rejects non-loopback `Host` values;
- rejects cross-site `Origin` values;
- bootstraps an HttpOnly, SameSite=Strict cookie from a same-origin request;
- supports a matching `x-jointly-session` header for authorized local clients;
- uses a 64 KiB body limit;
- rejects path traversal and symlink escape for dashboard assets and artifacts;
- redacts bearer tokens and common secret assignments from operational events.

### API routes

| Method and route | Purpose |
| --- | --- |
| `GET /api/health` | Local health status. |
| `GET /api/capabilities` | Honest fake/real inference, execution, isolation, and blocker state. |
| `POST /api/session` | Same-origin browser session bootstrap. |
| `GET /api/preflight` | Deterministic doctor report. |
| `GET /api/refs` | Exact configured base/change refs, commits, and prompt files. |
| `POST /api/runs` | Start only the labeled checkout-fixture fake replay. |
| `GET /api/runs` | List local run summaries. |
| `GET /api/runs/:runId` | Read one run state. |
| `GET /api/runs/:runId/events` | Read ordered server-sent events after a cursor. |
| `POST /api/runs/:runId/cancel` | Cancel a queued/running/paused simulation. |
| `POST /api/runs/:runId/resume` | Resume an interrupted or authorized resolved run after revalidation. |
| `POST /api/runs/:runId/resolutions` | Record an authorized requirement resolution. |
| `GET /api/runs/:runId/passport` | Read a registered passport artifact. |
| `GET /api/runs/:runId/artifacts/:artifactId` | Read one registered stage artifact. |

### Simulated lifecycle

The local coordinator models these stages:

```text
setup
baseline
intent-a
intent-b
hypotheses
generated-test-proposal
diagnosis
requirement-resolution
repair-proposal
review
verification
stability
passport
```

It persists atomic state, append-only NDJSON events, bounded retries, cancellation, restart recovery, artifact digests, and requirement-resolution pauses. Its default driver is `fake-replay`; every generated artifact is marked `simulated: true`. The fake passport uses `INSUFFICIENT_EVIDENCE` and cannot bypass failed gates.

This service proves lifecycle/UI behavior, not real investigation execution.

---

## 22. Provider-independent reasoning system

`@jointly/reasoning` defines a provider-neutral contract so deterministic code does not depend on IBM SDK response shapes.

### Seven reasoning stages

```text
extract-intent
discover-interactions
propose-test
diagnose
propose-repair
review-repair
draft-report
```

### Request controls

Every request includes:

- schema version, run ID, and unique attempt ID;
- stage;
- frozen input digest;
- trusted prompt-template ID, version, and digest;
- bounded context records with IDs, digests, content, and classification;
- configured model and maximum output tokens;
- deadline;
- remaining call, token, duration, and optional cost budget;
- allowed requirement IDs;
- allowed write prefixes.

### Output controls

- Every stage has a strict Zod schema.
- Intent requirement IDs must be unique.
- At most two interaction hypotheses are returned.
- Generated test content is bounded and must use `generated-tests/*.test.ts`.
- Proposed repairs are limited to eight files and allowed prefixes.
- Paths may not be absolute or contain `..`.
- Citations must reference supplied context IDs and digests.
- Requirement references must come from the request allowlist.
- Refusal, content filtering, truncation, malformed JSON, schema failure, timeout, cancellation, and budget exhaustion are explicit errors.

The engine computes a context digest and retains provider, model, request ID, finish reason, usage, duration, template identity, and sanitized diagnostics.

---

## 23. watsonx.ai adapter

`@jointly/watsonx-adapter` implements `InferenceTransport` using:

```text
@ibm-cloud/watsonx-ai 1.7.16
ibm-cloud-sdk-core 5.6.2
```

The locked SDK declares Node 20 or newer and is compatible with the repository's Node 22.19.x pin.

### Required server variables

```text
WATSONX_API_KEY
WATSONX_SERVICE_URL
WATSONX_PROJECT_ID
WATSONX_MODEL_ID
WATSONX_API_VERSION
```

The configuration reader reports names present or missing but never values.

### Transport behavior

- uses IBM Cloud IAM authentication;
- requires the request model to match `WATSONX_MODEL_ID`;
- requires the current trusted prompt-template digest;
- treats repository context as untrusted data;
- passes project, model, bounded token/temperature, and remaining time values;
- extracts generated text, provider model, request/correlation ID, finish reason, and token counts when available;
- never invents absent provider metadata;
- limits transport attempts to three;
- uses `Retry-After` or bounded exponential backoff capped at five seconds;
- maps authentication, authorization, quota, rate limit, timeout, provider outage, configuration, unsupported capability, cancellation, and invalid output into shared errors;
- redacts configured keys, bearer tokens, and common credential forms from error messages.

### Cancellation caveat

Local deadlines and abort signals prevent waiting and future retries. The chosen SDK boundary does not expose per-call HTTP abort, so provider work already in flight may continue and incur cost.

### Current validation status

- 22 mocked/offline adapter tests pass.
- One real live-smoke test is skipped by default.
- No live credential, model, quota, latency, cost, or full website result is claimed.
- The local lifecycle does not yet call this adapter.

The live smoke test requires explicit authorization, five secret variables, network access, and:

```text
JOINTLY_LIVE_WATSONX_SMOKE=1
```

It may incur cost and is not routine CI.

---

## 24. Configuration

The root `jointly.yaml` currently defines:

```yaml
project:
  name: jointly-checkout-demo
  root: examples/checkout

base:
  ref: jointly-demo-base

changes:
  - id: coupon
    ref: origin/agent/coupon
    promptFile: scenarios/checkout/coupon-prompt.md
  - id: payment-retry
    ref: origin/agent/payment-retry
    promptFile: scenarios/checkout/payment-retry-prompt.md

commands:
  build: npm run build
  test: npm test -- --reporter=json --outputFile=.jointly/vitest-existing-report.json
  testReport: .jointly/vitest-existing-report.json
  interactionTest: npm test -- --run tests/interaction --reporter=json --outputFile=.jointly/vitest-report.json
  interactionTestReport: .jointly/vitest-report.json

stability:
  iterations: 50
  concurrency: 4
  seed: 20260926
```

Validation rules include:

- project root and prompt/report paths must be repository-relative;
- relative paths may not contain `..`;
- exactly two changes are required;
- change IDs must be unique;
- test command is mandatory;
- stability values must be positive integers;
- interaction command and report path must be configured together.

---

## 25. Repository and package structure

```text
jointly/
├── AGENTS.md                         agent-facing engineering rules
├── BUILD_GUIDE.md                    historical product/build specification
├── README.md                         project entry point
├── package.json                      npm workspace scripts and Node pin
├── package-lock.json                 locked dependencies
├── jointly.yaml                      active fixture configuration
├── .nvmrc / .node-version            Node 22.19.x selection
├── .bob/
│   ├── custom_modes.yaml             Bob mode definition
│   ├── mcp.example.json              portable MCP template
│   ├── rules-ai-merge-investigator/  investigation/test/repair/evidence rules
│   └── skills/                       five project Skills
├── examples/checkout/                TypeScript checkout fixture
├── scenarios/
│   ├── checkout/                     primary collision prompts and validation
│   ├── compatible-cart/              compatible-pair fixture
│   └── profile-cache-collision/      second collision fixture
├── packages/
│   ├── core/                         deterministic engine and CLI
│   ├── mcp-server/                   nine Bob-callable STDIO tools
│   ├── dashboard/                    evidence viewer
│   ├── local-server/                 loopback API and simulated lifecycle
│   ├── reasoning/                    provider-independent schemas and engine
│   └── watsonx-adapter/              real IBM transport, live-unverified
├── runs/                              generated evidence; ignored except placeholder
├── bob_sessions/                      authentic Bob development screenshots
└── docs/                              architecture, plans, runbooks, and submission assets
```

### Workspace package scripts

| Package | Build | Test | Other |
| --- | --- | --- | --- |
| `@jointly/checkout` | `tsc` | `vitest run` | `start`, `test:watch` |
| `@jointly/core` | `tsc -p tsconfig.json` | `vitest run` | root CLI wrapper |
| `@jointly/mcp-server` | TypeScript | Vitest, one worker | `start` STDIO server |
| `@jointly/dashboard` | Type check + Vite build | `vitest run` | Vite dev server |
| `@jointly/local-server` | TypeScript | Vitest, one worker | local Fastify server |
| `@jointly/reasoning` | TypeScript | `vitest run` | provider contracts |
| `@jointly/watsonx-adapter` | TypeScript | `vitest run` | gated live test |

---

## 26. Artifact layout

A complete semantic run uses `runs/<run-id>/`. Important artifacts include:

```text
runs/<run-id>/
├── manifest.json
├── workspaces.json
├── diffs/
├── logs/
├── execution/
├── intents/
│   ├── coupon.json
│   └── payment-retry.json
├── interaction-surfaces.json
├── hypotheses.json
├── generated-tests/
├── test-results/
│   ├── existing.json
│   └── interaction evidence
├── runtime-diagnosis.json
├── requirement-resolutions.json
├── repair.patch
├── repair-summary.md
├── repair-metadata.json
├── repair-review.json
├── stability.json
├── evidence-summary.json
├── passport.json
└── passport.html
```

Local-server simulations use:

```text
runs/local-server/<run-id>/
├── state.json
├── events.ndjson
└── artifacts/<stage>.json
```

`runs/` is ignored because it may contain large workspaces, logs, generated code, and local paths. The chosen demonstration run must be reviewed for secrets, archived separately, and hashed.

---

## 27. Security model

### Implemented protections

- exact Git identity resolution and input digests;
- source-branch immutability;
- isolated candidate workspaces;
- repository-relative artifact/path rules;
- configured command allowlist;
- structured test classification;
- child environment allowlisting and redirected temporary/config locations;
- secret-aware operational redaction;
- provider-key redaction tests;
- same-origin, loopback-only local API session;
- bounded bodies, passport sizes, strings, arrays, and stage retries;
- symlink/path-traversal checks;
- evidence fingerprints and stale-artifact rejection;
- supported-verdict allowlist;
- safe-verdict gate enforcement.

### Credential rule

watsonx, GitHub, cloud, CI, SSH, npm-token, proxy, and other service credentials must remain in the authorized parent/server process and must not be inherited by repository build, test, or generated-test children. Child environments should be constructed from a documented allowlist.

### Remaining isolation gap

Environment separation alone is not hostile-code isolation. Repository commands run as the same operating-system user and could attempt to read files, inspect processes, connect to sockets, or access networks. Therefore:

- local analysis is restricted to trusted repositories;
- the website reports generated-code execution unavailable;
- hosted execution is blocked until stronger filesystem/process/network isolation and canary-secret tests exist;
- authorization must cover every user, repository, run, artifact, resolution, candidate, and publication route in a hosted release.

### Publication rule

No automated source-branch mutation or merge is permitted. The roadmap publication flow requires exact-candidate review, current-ref revalidation, explicit human approval, idempotency protection, and one separate integration PR.

---

## 28. Installation and setup

### Prerequisites

- Node.js 22.19.x;
- npm;
- Git;
- IBM Bob IDE only for the assisted workflow;
- watsonx credentials only for a separately authorized live smoke test.

Node 24 is not the supported runtime even if it appears to work locally.

### macOS/Linux

```bash
git clone https://github.com/akiibot/jointly.git
cd jointly
git checkout hackathon-recording-v1
node --version
npm ci
npm run build
npm test
npm run jointly -- doctor
```

### Windows PowerShell

```powershell
git clone https://github.com/akiibot/jointly.git jointly
cd jointly
git checkout hackathon-recording-v1
node --version
npm.cmd ci
npm.cmd run build
npm.cmd test
npm.cmd run jointly -- doctor --json
```

Expected Node output begins with:

```text
v22.19.
```

### Bob setup

```powershell
npm.cmd run jointly -- setup
```

Reload Bob, select **Jointly – AI Merge Investigator**, and manually confirm the five Skills and nine tools.

---

## 29. Command reference

### Root commands

```bash
npm run build
npm test
npm run test:checkout
npm run jointly -- doctor
npm run jointly -- doctor --json
npm run jointly -- setup
npm run jointly -- analyze
npm run local
```

### Purpose

| Command | Purpose |
| --- | --- |
| `npm run build` | Build every workspace with a build script. |
| `npm test` | Run every workspace test suite. |
| `npm run test:checkout` | Run only the checkout fixture tests. |
| `jointly doctor` | Validate deterministic readiness and report provider variable names without values. |
| `jointly setup` | Generate or propose the local Bob MCP configuration. |
| `jointly analyze` | Create a run, prepare workspaces, build, and run configured existing tests. |
| `npm run local` | Build and serve the dashboard plus authenticated local service. |

### Package-focused examples

```bash
npm test --workspace=@jointly/core
npm test --workspace=@jointly/mcp-server
npm test --workspace=@jointly/dashboard
npm test --workspace=@jointly/reasoning
npm test --workspace=@jointly/watsonx-adapter
npm run dev --workspace=@jointly/dashboard
```

---

## 30. Complete Bob-assisted run procedure

Use these exact fixture inputs:

```text
base: jointly-demo-base
change A: agent/coupon or configured origin/agent/coupon
prompt A: scenarios/checkout/coupon-prompt.md
change B: agent/payment-retry or configured origin/agent/payment-retry
prompt B: scenarios/checkout/payment-retry-prompt.md
```

Procedure:

1. Run `doctor`; stop if deterministic readiness is blocked.
2. Confirm mode, five Skills, and nine tools in Bob.
3. Call `register_run` and record the run ID and full frozen commits.
4. Call `prepare_workspaces`; stop or report `TEXTUAL_CONFLICT` if preparation fails.
5. Run existing tests in base, A, B, and combined.
6. Stop with `INDEPENDENT_CHANGE_FAILED` if A or B fails independently.
7. Extract and persist both intent contracts with citations.
8. Discover interaction surfaces and rank the `Order.total` hypothesis.
9. Generate one focused test in the allowed generated-test location.
10. Run it with `evidenceLabel: before-repair`.
11. Confirm the result is an assertion tied to expected HTTP 201 and observed 400, not test invalidity.
12. Persist the runtime diagnosis and linked requirement IDs.
13. If the formula conflict requires authority, record an authorized resolution; otherwise stop.
14. Apply the smallest repair only inside `combined`.
15. Call `export_resolution_patch`.
16. Rerun the unchanged test with `evidenceLabel: after-repair`.
17. Rerun existing tests and bind their fingerprints to the repaired candidate.
18. Complete the fresh repair review.
19. Run 50 stability iterations, concurrency 4, seed 20260926.
20. Call `collect_evidence` for verification/passport.
21. Call `generate_passport` with the evidence-supported verdict.
22. Confirm original source refs did not change.
23. Open the resulting passport in the dashboard.

Never instruct Bob to force a safe result. A real blocker is the correct output when evidence is incomplete.

---

## 31. Testing and verified metrics

The full workspace suite was run successfully on 2026-09-27 against code revision `e8269d6`; subsequent recording-tag changes were documentation only.

| Workspace | Test files | Result |
| --- | ---: | ---: |
| Checkout fixture | 4 | 38 passed |
| Deterministic core | 17 | 55 passed |
| Dashboard | 1 | 11 passed |
| Local lifecycle/API | 1 | 13 passed |
| MCP server | 8 | 19 passed |
| Reasoning contracts/fake | 1 | 7 passed |
| watsonx adapter | 2 | 22 passed, 1 skipped |
| **Total** | **34** | **165 passed, 1 skipped** |

The skipped test is the separately gated live watsonx smoke test. It is not a failure, but it also is not evidence of live inference.

### Test coverage themes

- configuration validation and path safety;
- manifest and provenance integrity;
- workspace creation and textual conflict handling;
- structured Vitest parsing;
- assertion versus invalid/environment classification;
- timeouts, signals, cancellation, and spawn failures;
- compatible-pair and multiple collision fixtures;
- requirement resolution;
- stability fingerprints;
- passport safe and non-safe verdict gates;
- Bob configuration generation;
- actual MCP client/server protocol behavior;
- dashboard import validation and all verdict presentations;
- local-session, origin, path, event, retry, restart, and artifact behavior;
- reasoning budgets, schemas, context citations, and write paths;
- watsonx configuration, metadata, error mapping, retries, deadlines, cancellation, and secret redaction.

### Honest KPI classification

Verified engineering metrics include 165 passing tests, 34 test files, five Skills, nine tools, four workspaces, and fifty golden-run stability iterations. Customer outcomes such as hours saved or defect reduction are not yet measured.

---

## 32. Failure handling and troubleshooting

### Node reports version 24

Select/install Node 22.19.x, reopen the terminal, and verify again before installing dependencies.

### Bob cannot see MCP tools

1. Run the build.
2. Run `jointly setup`.
3. Inspect `.bob/mcp.json` for the correct absolute `cwd`.
4. Use forward slashes in Windows JSON paths.
5. Reload Bob.
6. Confirm `packages/mcp-server/dist/server.js` exists.

### `.bob/mcp.generated.json` appears

An existing config was preserved. Manually merge the generated `jointly` server entry into `.bob/mcp.json`; do not commit machine paths.

### Generated test exits nonzero

Inspect structured counts and failure details. Do not classify a collision until the test is valid, actually ran, and failed for the hypothesis-linked assertion.

### Textual conflict

Record `TEXTUAL_CONFLICT`, including affected files. Do not force the semantic path or silently edit source branches.

### Independent branch test fails

Record `INDEPENDENT_CHANGE_FAILED`. The two-change interaction question is not meaningful until the independent input is healthy or the operator explicitly supplies a new input.

### Requirement ambiguity

Pause. Preserve original statements. Obtain an authorized decision and record its source; do not ask AI to invent product authority.

### Dashboard import fails

Remain in import error mode. Never fall back to the bundled successful sample. Check schema version, exactly two changes, verdict support, commit IDs, gates, size, and nested bounds.

### Local service is unavailable

Run `npm run local` and open the exact loopback URL it prints. The connected-local page must use the same service origin so the HttpOnly session bootstrap works.

### Live watsonx test fails

Do not modify deterministic gates to accommodate it. Classify configuration, authorization, model access, quota, network, timeout, or provider output separately and retain redacted diagnostics.

### Windows POSIX fixture differences

Some conflict-fixture assertions are intentionally skipped where the operating system cannot provide the same POSIX behavior. Do not treat a platform-specific skip as semantic verification.

---

## 33. Contribution and authorship record

Accurate attribution is a project requirement.

### Existing/Codex work

The deterministic core, classification fixes, evidence schemas, provider-independent reasoning contracts, fake lifecycle, website controls, fixtures, MCP compatibility tests, documentation, and most security/verification improvements are pre-existing or Codex-authored as reflected in Git history.

### IBM Bob development work

Bob was substantively used for architecture planning, checkout fixture work, agent prompts/changes, MCP development, intent analysis, collision testing, repair verification, passport work, and dashboard development. Authentic progressive screenshots are under `bob_sessions/`.

### watsonx adapter split

- Bob task/session: `47634a6502c2e9247f90f58a10cbca05`.
- Bob version: 1.5.82.
- Bob starting commit: `c1a4dda8886694ac2fa9e32c807133f8b7c38004`.
- Bob snapshot: `7b36558dd9d585a122533767e5d0942bf8fec932`.
- Snapshot branch: `bob/b1-watsonx-adapter-snapshot`.
- Bob authored the initial adapter, provider tests, live-test gate, and documentation.
- Codex ported it to the current contracts, added compatibility/security checks, and completed offline verification.

### Unperformed Bob work

The planned B2 cross-workflow integration/security review was not completed because Bob allowance was exhausted. It must not be represented as finished or substituted with retroactive attribution.

### UI polish after this snapshot

Any subsequent hackathon UI redesign performed by a teammate using Codex belongs to that teammate/Codex workflow. It becomes a Bob contribution only if Bob materially participates and authentic task evidence is retained.

---

## 34. Demonstration and pitch guidance

### Recommended story

```text
Two green changes → clean merge → hidden failed interaction
→ evidence-linked diagnosis → isolated repair
→ unchanged test passes → regressions pass → 50/50 stability
→ scoped Merge Safety Passport
```

### Current versus roadmap language

Use:

> Today, Jointly proves the verification workflow inside IBM Bob. Next, we are productizing that same evidence core as a secure watsonx-powered GitHub service.

Do not say the hosted watsonx workflow is complete.

### Verified presentation metrics

- 165 passing automated tests;
- 34 test files;
- five Bob Skills;
- nine typed MCP tools;
- four isolated workspaces;
- fifty stability iterations;
- zero source branches modified by an investigation.

### Judging alignment

- **Application of Technology:** structured Bob mode, Skills, MCP, and deterministic gates.
- **Presentation:** one concrete checkout story with visible before/after evidence.
- **Business Value:** reduces uncertainty where parallel AI work creates integration risk.
- **Originality:** generates the interaction test neither change author anticipated.

The full timed script is in `docs/hackathon-video-production-script.md`. The pitch, KPI, Q&A, and submission source is `docs/hackathon-pitch-submission-kit.md`.

---

## 35. Limitations

- exactly two changes;
- one common Git base;
- fixture-first TypeScript/npm/Vitest support;
- local trusted-repository execution;
- no production database;
- no general N-change interaction graph;
- no automatic merge or push;
- no formal proof of all behaviors;
- no universal security analysis;
- no arbitrary ecosystem adapters;
- no hosted identity, durable database, queue, worker sandbox, or organization dashboard;
- no GitHub App, PR metadata ingestion, status checks, comments, or branch-protection integration;
- no guarantee of production-environment equivalence;
- no hostile-repository sandbox;
- no live watsonx capability validation;
- no real website reasoning/execution path;
- no completed B2 Bob integration review;
- no verified live deployment or published integration PR in the current evidence set.

Jointly complements code review, security review, and production testing. It does not replace them.

---

## 36. Roadmap

### Hackathon release

The minimum honest release is:

- one approved synthetic public repository;
- one authorized operator;
- working Bob IDE + MCP investigation;
- generated interaction test;
- isolated verified repair;
- evidence passport;
- clear separation between current product and hosted roadmap.

### Next technical gates

1. Finish credential-separated execution with filesystem/process/network isolation and canary-secret tests.
2. Run an explicitly authorized minimal watsonx live capability check.
3. Connect real reasoning stages to the same deterministic services used by MCP.
4. Preserve Bob/MCP regression behavior while adding website orchestration.
5. Implement authenticated per-user/repository/run/artifact authorization.
6. Add durable storage, queueing, worker isolation, cancellation, and recovery.
7. Implement GitHub App selection with exact installation and repository scope.
8. Require candidate review, ref revalidation, and explicit approval before publishing one integration PR.
9. Capture live provider provenance, usage, latency, and unavailable metadata honestly.

### Later expansion

- additional languages and test frameworks;
- repository-specific adapters;
- more than two changes through an interaction graph;
- organization policies and audit retention;
- pilot measurement of collision precision, reviewer time, escaped defects, repair acceptance, cost, and latency.

---

## 37. Release and submission checklist

### Engineering

- [ ] Node 22.19.x confirmed.
- [ ] Clean install succeeds.
- [ ] Full build succeeds.
- [ ] Full test suite succeeds with only the documented live test skipped.
- [ ] `doctor` reports deterministic readiness.
- [ ] Bob discovers mode, five Skills, and nine tools.
- [ ] Exact run inputs and final Git SHA are recorded.
- [ ] Original source refs remain unchanged.
- [ ] Selected run archive is reviewed and hashed.

### Evidence

- [ ] Relevant Bob code/files remain in the public repository.
- [ ] Every claimed Bob contributor supplies a task-session summary screenshot.
- [ ] B1 and Codex adapter contributions remain separately attributed.
- [ ] Mock tests are not labeled live provider evidence.
- [ ] B2 remains incomplete unless authentic work occurs.

### Submission fields from supplied screenshots

- [ ] Problem & Solution Statement is 500 words or fewer.
- [ ] IBM Bob Usage Statement is 500 words or fewer.
- [ ] Repository is publicly accessible while logged out.
- [ ] Video is MP4 and no longer than three minutes.
- [ ] At least 90 seconds show the solution in action.
- [ ] Narration explains the demonstration.
- [ ] IBM Bob usage is clearly shown.
- [ ] Presentation supports technology, business value, originality, and clarity.

### Final external checks

- [ ] Recheck exact deadline and time zone on the signed-in form.
- [ ] Verify cover, deck, thumbnail, file-size, and codec fields.
- [ ] Verify repository, application, and video links from a separate device/private browser.
- [ ] Scan Git history, footage, screenshots, and archives for secrets.
- [ ] Save the final submission receipt, status, and timestamp.

---

## 38. Glossary

**Candidate:** the isolated combined workspace containing both changes and, optionally, a repair.
**Collision:** a behavior where the combined changes violate one or more linked intents.
**Common base:** the Git ancestor from which both changes are evaluated.
**Deterministic core:** the code that owns Git, execution, artifacts, hashes, stability, and verdict gates.
**Evidence gate:** a condition that must be supported by valid current artifacts before a verdict is allowed.
**Execution fingerprint:** a digest-bound record connecting a command result to inputs and candidate state.
**Intent contract:** structured, testable requirements derived from a change's source prompt and evidence.
**Interaction surface:** a shared symbol, state, API, side effect, or concept that can connect two changes.
**MCP:** Model Context Protocol; Bob uses it to call Jointly's typed local tools.
**Merge Safety Passport:** the final scoped evidence record and verdict for exact inputs.
**Requirement resolution:** an authorized record of how an actual requirement conflict is handled.
**Semantic collision:** an incompatibility in behavior or intent without necessarily overlapping text.
**Stability matrix:** repeated execution under a fixed seed schedule to detect inconsistent behavior.
**Verification basis:** either a repaired confirmed collision or a compatible tested pair.

---

## 39. Reference documents

### Product and architecture

- `README.md`
- `AGENTS.md`
- `BUILD_GUIDE.md`
- `docs/architecture.md`
- `docs/limitations.md`
- `docs/implementation-inventory.md`
- `docs/improvement-implementation-plan.md`
- `docs/improvement-progress.md`

### Operation

- `docs/local-quickstart.md`
- `docs/h1-operational-runbook.md`
- `docs/demo-script.md`
- `docs/rehearsal-checklist.md`
- `docs/windows-bob-recording-runbook.md`

### IBM Bob evidence and tasks

- `docs/bob-development-evidence.md`
- `docs/bob-task-briefs.md`
- `bob_sessions/README.md`
- `.bob/MCP_SETUP.md`

### Submission

- `docs/hackathon-video-production-script.md`
- `docs/hackathon-pitch-submission-kit.md`
- `docs/submission-problem-solution-statement.md`
- `docs/submission-bob-usage-statement.md`
- `docs/submission-source-checklist.md`

### Scenario

- `scenarios/checkout/project-invariants.md`
- `scenarios/checkout/expected-collision.md`
- `scenarios/checkout/coupon-prompt.md`
- `scenarios/checkout/payment-retry-prompt.md`
- `scenarios/checkout/proposed-requirement-resolution.json`

---

## Final project statement

Jointly's central contribution is not another AI review opinion. It is a disciplined boundary between probabilistic reasoning and executable proof. IBM Bob helps identify the interaction humans and agents failed to anticipate; Jointly freezes the inputs, runs the test, verifies the repair, preserves the evidence, and limits the conclusion to what was actually demonstrated.

**Build separately. Ship safely. Jointly.**
