# Jointly — P0 Implementation Plan

**Goal:** Build a working MVP of Jointly that detects a hidden behavioral collision between two independently correct AI-generated changes, repairs it using IBM Bob, and produces a Merge Safety Passport — all demonstrated through a local checkout scenario.

**Authoritative spec:** `BUILD_GUIDE.md`  
**Project rules:** `AGENTS.md`

---

## Milestone dependency order

```
M1: Golden checkout scenario
  └─> M2: Deterministic Jointly core
        └─> M3: Local MCP server
              └─> M4: Bob custom mode and Skills
                    └─> M5: Intent analysis and interaction-test generation
                          └─> M6: Collision repair and verification
                                └─> M7: Merge Safety Passport
                                      └─> M8: Dashboard
M1 through M7 (stable) ──────────────> M9: Submission preparation
```

---

## M1 — Golden checkout scenario

**Status:** `[ ] pending`

### Objective

Create the `examples/checkout` application with the two agent branches and manually confirm the hidden semantic collision exists. This is the scenario fixture that every subsequent milestone depends on.

### Files and directories

```
examples/checkout/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    models.ts                 # Order, Coupon, Payment, Discount types
    repositories/
      interfaces.ts           # OrderRepository, CouponRepository, PaymentRepository interfaces
      in-memory/
        order-store.ts
        coupon-store.ts
        payment-store.ts
    services/
      order-service.ts
      coupon-service.ts
      checkout-service.ts
      payment-service.ts
    api/
      routes.ts               # Fastify handlers
    index.ts                  # server entry point
  tests/
    coupon.test.ts            # Change A unit tests
    payment-retry.test.ts     # Change B unit tests
    checkout-base.test.ts     # baseline integration tests
    interaction/
      coupon-payment-retry.test.ts   # manually authored cross-change test

scenarios/checkout/
  coupon-prompt.md            # Change A prompt text
  payment-retry-prompt.md     # Change B prompt text
  project-invariants.md       # shared business rules
  expected-collision.md       # description of the hidden interaction
```

### Git branch structure

```
main                  base application, passes baseline tests
agent/coupon          main + coupon feature (Change A)
agent/payment-retry   main + payment-retry feature (Change B)
```

Both `agent/*` branches must originate from the same `main` commit.

### Implementation tasks

1. **Create `examples/checkout` base application on `main`.**
   - **Persistence:** in-memory repository only. Define a repository interface for each entity (`OrderRepository`, `CouponRepository`, `PaymentRepository`) so SQLite could be added later, but do not implement SQLite during the hackathon unless all P0 milestones are already complete. The demonstration does not require state across process restarts.
   - **API framework:** Fastify. Keep the API minimal. No authentication, sessions, or production plugins.
   - Models: `Order`, `Coupon`, `Payment`, `Discount`.
   - Services: order creation, tax calculation, checkout finalization.
   - API: at minimum `POST /orders`, `POST /orders/:id/checkout`, `POST /payments`.
   - Baseline tests covering the above.

2. **Write `scenarios/checkout/coupon-prompt.md`.**
   Content (verbatim from `BUILD_GUIDE.md §7`):
   > Add percentage-based coupons to checkout. Discounts must apply before tax. A coupon can affect an order only once. Invalid coupons must not modify the order.

3. **Create branch `agent/coupon` from `main`.** Implement Change A:
   - `coupon-service.ts`: validate coupon, apply percentage discount to pretax subtotal, enforce one-per-order.
   - `coupon-store.ts`: track applied discounts per order.
   - Update `checkout-service.ts` to call coupon application.
   - Tests in `coupon.test.ts`:
     - Valid coupon reduces subtotal.
     - Invalid coupon changes nothing.
     - Percentage calculation is correct.
   - Do **not** write tests involving payment retries.

4. **Write `scenarios/checkout/payment-retry-prompt.md`.**
   Content (verbatim from `BUILD_GUIDE.md §7`):
   > Add idempotent payment retries. Requests with the same idempotency key must return the same payment result, must not create another payment, and must not modify the finalized order.

5. **Create branch `agent/payment-retry` from `main`.** Implement Change B:
   - `payment-service.ts`: accept `idempotencyKey`, look up existing payment by key before creating a new one.
   - `payment-store.ts`: index payments by idempotency key.
   - Retry path calls checkout finalization again (this is the intentional bug — do not fix it).
   - Tests in `payment-retry.test.ts`:
     - Duplicate request returns original payment.
     - Only one payment record exists.
     - Different keys create different payment attempts.
   - Do **not** write tests involving coupons.

6. **Plant the hidden collision deliberately.**
   The payment retry path must re-invoke checkout finalization. Checkout finalization must re-apply coupon discount unconditionally (no idempotency guard on discount application). This makes a retried payment on a discounted order apply the coupon twice, violating `COUPON-2` and `PAYMENT-2`.

7. **Author `tests/interaction/coupon-payment-retry.test.ts` manually.**
   This test is used only to prove the scenario works — it is not part of the Jointly engine. It must match the shape in `BUILD_GUIDE.md §7`:
   ```ts
   it("does not reapply a coupon when payment is retried", async () => { ... })
   ```
   The test must fail on the merged branches and pass after a correct repair.

8. **Author `scenarios/checkout/expected-collision.md`** describing the collision for human reviewers.

9. **Verify the four-state matrix manually:**
   ```
   main alone                   PASS
   agent/coupon alone           PASS
   agent/payment-retry alone    PASS
   combined (no textual conflict) existing tests PASS
   manually authored cross-change test           FAIL
   ```

### Tests

- All tests in `examples/checkout/tests/` must use Vitest.
- Run from the `examples/checkout/` directory: `npm test -- --run`.
- Run a single file: `npm test -- --run coupon`.

### Exit criteria

- `agent/coupon` and `agent/payment-retry` both originate from the same `main` commit.
- Both branches pass their own tests independently.
- `git merge agent/payment-retry` onto `agent/coupon` (or vice versa) completes with no textual conflict.
- The merged tree passes all existing tests.
- The manually authored cross-change test fails on the merged tree for the predicted reason (double coupon application).
- This state is reproducible from a clean clone.

### Dependencies

None. This is the foundation.

---

## M2 — Deterministic Jointly core

**Status:** `[ ] pending`

### Objective

Build the TypeScript core library that Jointly uses to validate inputs, create isolated Git workspaces, run commands, and persist run artifacts. No AI reasoning here — pure deterministic tooling.

### Files and directories

```
packages/core/
  package.json
  tsconfig.json
  src/
    config.ts           # parse and validate jointly.yaml
    manifest.ts         # create and persist RunManifest
    changes.ts          # resolve git refs, validate common base
    workspace.ts        # create isolated worktrees or clones
    git.ts              # thin wrapper over Git CLI
    runner.ts           # execute commands with timeout and output capture
    evidence.ts         # write structured artifacts to runs/<run-id>/
    stability.ts        # repeat a test command N times with fixed seed
    passport.ts         # assemble passport.json from run artifacts
  tests/
    config.test.ts
    manifest.test.ts
    changes.test.ts
    workspace.test.ts
    runner.test.ts
    evidence.test.ts
    passport.test.ts

jointly.yaml            # top-level run configuration for the checkout scenario
runs/
  .gitkeep
```

### Key data types

Implement the TypeScript interfaces from `BUILD_GUIDE.md §14` verbatim:
`RunManifest`, `ChangePackage`, `RunCommands`, `StabilityConfig`, `IntentRequirement`, `IntentContract`, `InteractionSurface`, `CollisionHypothesis`, `CommandResult`, `CollisionEvidence`, `StabilityResult`.

These types are the shared contract across all packages — place them in `packages/core/src/types.ts`.

### Implementation tasks

1. **`config.ts`** — parse `jointly.yaml`. Validate required fields: `project.name`, `project.root`, `base.ref`, two entries in `changes[]`, `commands.test`. Reject configs with more than two changes (MVP constraint).

2. **`git.ts`** — wrap Git CLI calls: resolve a ref to a commit SHA, check if two refs share a common base, list changed files in a diff, create a worktree, apply a branch to a worktree. Never shell-escape user input directly — build argument arrays.

3. **`workspace.ts`** — create four named workspaces under `runs/<run-id>/workspaces/`: `base`, `change-a`, `change-b`, `combined`. Each workspace is an isolated Git worktree or temporary clone. Record resolved commit SHAs. Detect and classify textual merge conflicts separately from semantic analysis.

4. **`runner.ts`** — execute a shell command in a given working directory. Enforce a configurable timeout. Capture stdout and stderr. Truncate captured output to a configurable max bytes before storing in memory. Write full output to a `.log` file. Return a `CommandResult`.

5. **`evidence.ts`** — write all artifacts to `runs/<run-id>/` following the directory layout in `BUILD_GUIDE.md §14`. Provide helpers to write JSON, save log files, and link evidence records to requirement IDs.

6. **`stability.ts`** — repeat a test command the configured number of iterations with a fixed seed. Control concurrency. Record pass/fail counts. Preserve failing-iteration logs. Return a `StabilityResult`.

7. **`manifest.ts`** — generate a unique `runId` (timestamp + short hash), create `runs/<run-id>/manifest.json`, validate that both changes originate from the same base commit.

8. **`passport.ts`** — assemble `passport.json` from the artifacts collected in `runs/<run-id>/`. Enforce that verdict is one of the six allowed strings. `passport.ts` must not contain any analysis logic — it only reads and assembles existing artifact files.

9. **`jointly.yaml` for the checkout scenario** — wire up `examples/checkout` with both change refs, test command, and stability config (50 iterations, concurrency 4, seed 20260926).

10. **CLI entry point** — add a minimal `npm run jointly -- analyze` command that: loads config, registers the run, prepares workspaces, runs existing tests in all four workspaces, and writes results to `runs/<run-id>/`.

### Tests

Every module has a corresponding test file. Key test cases:
- Config rejects missing required fields.
- Config rejects more than two changes.
- Manifest generates unique run IDs.
- `changes.ts` rejects changes that do not share a common base commit.
- Runner captures exit code, respects timeout, truncates output correctly.
- Evidence writes valid JSON and links to correct artifact paths.
- Passport assembles correctly from fixture artifact files and rejects invalid verdict strings.
- Workspace creation produces four directories with correct commits applied.

### Exit criteria

```
npm run jointly -- analyze
```

completes against the checkout scenario, creates `runs/<run-id>/`, and records passing test results for all four workspaces (base, change-a, change-b, combined).

### Dependencies

M1 (checkout scenario must exist to validate the core against a real scenario).

---

## M3 — Local MCP server

**Status:** `[ ] pending`

### Objective

Expose the Jointly core as a local STDIO MCP server so IBM Bob can call it as a tool. All nine required MCP tools must be implemented and independently testable.

### Files and directories

```
packages/mcp-server/
  package.json
  tsconfig.json
  src/
    server.ts
    tools/
      register-run.ts
      prepare-workspaces.ts
      read-change-diff.ts
      run-existing-tests.ts
      run-generated-test.ts
      run-stability-matrix.ts
      collect-evidence.ts
      export-resolution-patch.ts
      generate-passport.ts
  tests/
    tools/
      register-run.test.ts
      prepare-workspaces.test.ts
      run-existing-tests.test.ts
      run-generated-test.test.ts
      run-stability-matrix.test.ts
      generate-passport.test.ts

.bob/
  mcp.json             # points to packages/mcp-server/dist/server.js
```

### Tool contracts

Implement the nine tools listed in `BUILD_GUIDE.md §13`. Input/output schemas follow the interfaces in `packages/core/src/types.ts`.

Key safety rules (from spec §13):
- Accept only repository-relative or run-relative paths — no absolute paths from tool input.
- Execute only commands from `jointly.yaml` `commands.*` — never execute a command string passed directly through a tool argument.
- Enforce timeouts on every command execution.
- Truncate captured output before returning it in tool responses.
- Redact obvious secrets (environment variable values matching `*_KEY`, `*_SECRET`, `*_TOKEN` patterns).
- Never operate on the developer's primary working branch.

### Implementation tasks

1. **`server.ts`** — initialize the MCP server with `StdioServerTransport`. Register all nine tools. Handle startup errors gracefully without crashing the Bob session.

2. **Tool: `register_run`** — validate inputs, call `packages/core` manifest and config modules, return normalized run ID and paths.

3. **Tool: `prepare_workspaces`** — call `packages/core` workspace module, return workspace paths and resolved commit SHAs. Return textual merge conflict details separately under a `textualConflict` field — do not mix with semantic analysis results.

4. **Tool: `read_change_diff`** — return a size-bounded diff for a given change ID. List touched files. Never return files matching `.gitignore` or containing secrets.

5. **Tool: `run_existing_tests`** — execute the configured test command in the specified workspace. Return bounded summary plus artifact path for full log.

6. **Tool: `run_generated_test`** — run a specific test file in the combined workspace. Distinguish compilation failure (`test-invalid`) from assertion failure (`confirmed-collision` candidate). Return classification in the response.

7. **Tool: `run_stability_matrix`** — call `packages/core` stability module. Accept iterations, concurrency, and seed from the tool input (defaulting to `jointly.yaml` values). Return `StabilityResult`.

8. **Tool: `collect_evidence`** — validate that required artifacts exist in `runs/<run-id>/`. Link evidence records to requirement IDs. Return a structured evidence summary.

9. **Tool: `export_resolution_patch`** — produce `repair.patch` via `git diff` between the pre-repair and post-repair states of the combined workspace. Include a changed-file summary. Never write to original branches.

10. **Tool: `generate_passport`** — call `packages/core` passport module. Write `passport.json` and `passport.html`. Return the verdict string.

11. **`.bob/mcp.json`** — register the server. Use absolute path for `cwd`. Include a comment in the README reminding implementers to update this path per machine.

### Tests

- Each tool has a unit test using the checkout scenario's `runs/` fixtures.
- `run_generated_test` correctly classifies a compilation error as `test-invalid`.
- `run_generated_test` correctly classifies an assertion failure as a `confirmed-collision` candidate.
- `export_resolution_patch` does not touch the original branches.
- `register_run` rejects configs with more than two changes.

### Exit criteria

- Every MCP tool responds correctly when called individually via the MCP inspector or Bob.
- Bob can discover and list the nine tools in its MCP panel.
- `run_generated_test` correctly classifies the manually authored cross-change test as a `confirmed-collision` candidate when run against the merged branches.

### Dependencies

M2 (MCP tools are thin wrappers over the core library).

---

## M4 — Bob custom mode and Skills

**Status:** `[ ] pending`

### Objective

Configure IBM Bob with the `ai-merge-investigator` custom mode and five focused Skills so that Bob has the structured workflow, reasoning rules, and output schemas needed to perform the investigation.

### Files and directories

```
.bob/
  custom_modes.yaml
  rules-ai-merge-investigator/
    01-investigation-rules.md
    02-test-generation-rules.md
    03-repair-rules.md
    04-evidence-requirements.md
  skills/
    extract-intent-contract/
      SKILL.md
      intent-schema.json
    discover-interactions/
      SKILL.md
      collision-checklist.md
    generate-interaction-tests/
      SKILL.md
      test-quality-checklist.md
    repair-collision/
      SKILL.md
      repair-policy.md
    generate-merge-passport/
      SKILL.md
      passport-template.md
```

### Implementation tasks

1. **`custom_modes.yaml`** — define the `ai-merge-investigator` mode exactly as specified in `BUILD_GUIDE.md §12`. Groups: `read`, `edit`, `execute`, `mcp`, `skill`, `subagent`. Verify slug and group names against the installed Bob version before the demonstration.

2. **`rules-ai-merge-investigator/01-investigation-rules.md`** — encode investigation constraints:
   - Analyze each prompt independently before comparing changes.
   - Separate facts from assumptions.
   - Use stable requirement IDs (`COUPON-N`, `PAYMENT-N`).
   - Rank hypotheses; limit MVP to top two.
   - Prioritize shared state, side effects, contracts, and temporal behavior.

3. **`rules-ai-merge-investigator/02-test-generation-rules.md`** — encode test-generation constraints:
   - Follow existing Vitest conventions in `examples/checkout/tests/`.
   - Generate the smallest useful interaction test.
   - Exercise behavior from both changes.
   - Make expected behavior explicit with named constants.
   - Do not modify production code during test generation.

4. **`rules-ai-merge-investigator/03-repair-rules.md`** — encode repair constraints:
   - Preserve both intent contracts.
   - Do not weaken assertions to achieve green tests.
   - Prefer the smallest root-cause fix.
   - Explain why the fix addresses the root cause.
   - Export a reviewable patch.

5. **`rules-ai-merge-investigator/04-evidence-requirements.md`** — encode evidence constraints:
   - Record command, exit code, duration, and bounded output for every tool call.
   - Link every finding to a requirement ID.
   - Never claim a confirmed collision without a failing executable test.
   - Save before/after test results.

6. **Skill: `extract-intent-contract`** — SKILL.md instructs Bob to:
   - Read one prompt file.
   - Produce structured JSON matching `intent-schema.json` (mirrors `IntentContract` from core types).
   - Assign stable requirement IDs.
   - Flag ambiguities.
   - Save to `runs/<run-id>/intents/<change-id>.json`.

7. **Skill: `discover-interactions`** — SKILL.md instructs Bob to:
   - Load both `IntentContract` files and both diffs via `read_change_diff`.
   - Work through the `collision-checklist.md` (shared state, side effects, temporal behavior, etc.).
   - Produce ranked `CollisionHypothesis[]`.
   - Save to `runs/<run-id>/hypotheses.json`.

8. **Skill: `generate-interaction-tests`** — SKILL.md instructs Bob to:
   - Take one `CollisionHypothesis` as input.
   - Generate a Vitest test following `test-quality-checklist.md`.
   - Save to `runs/<run-id>/generated-tests/`.
   - Call `run_generated_test` to validate before claiming success.

9. **Skill: `repair-collision`** — SKILL.md instructs Bob to:
   - Read both intent contracts, the hypothesis, and the failing test.
   - Diagnose the root cause.
   - Apply the minimal repair only in the combined workspace.
   - Call `run_existing_tests` and `run_generated_test` to verify.
   - Call `export_resolution_patch` to save the patch.

10. **Skill: `generate-merge-passport`** — SKILL.md instructs Bob to:
    - Collect all run artifacts.
    - Call `generate_passport`.
    - Present a human-readable summary matching the passport template.
    - Avoid claims unsupported by test output.

### Bob session screenshots

**Capture a Bob task-session summary screenshot after every major Bob task — do not wait until M9.** Save screenshots to `bob_sessions/` as you complete each task. Filename convention:

```
bob_sessions/
  <teamname>_task01_architecture_summary.png
  <teamname>_task02_checkout_base_summary.png
  <teamname>_task03_agent_changes_summary.png
  <teamname>_task04_mcp_server_summary.png
  <teamname>_task05_intent_analysis_summary.png
  <teamname>_task06_collision_test_summary.png
  <teamname>_task07_repair_verification_summary.png
  <teamname>_task08_submission_review_summary.png
```

Capturing as you go prevents scrambling to reconstruct evidence at submission time.

### Tests

- Load `custom_modes.yaml` in Bob and verify the `ai-merge-investigator` mode appears.
- Manually invoke each Skill through Bob in the custom mode and confirm it produces the expected output format (intent contract, hypotheses list, generated test file, repair diff, passport summary).

### Exit criteria

- Bob enters `ai-merge-investigator` mode without errors.
- Bob can call all nine MCP tools from within the mode.
- Each Skill produces a correctly structured output artifact when manually invoked against the checkout scenario.
- At least one Bob session screenshot has been saved to `bob_sessions/`.

### Dependencies

M3 (Skills invoke MCP tools; mode must see the server).

---

## M5 — Intent analysis and interaction-test generation

**Status:** `[ ] pending`

### Objective

Run the full analysis workflow through Bob: extract intent contracts from both prompts, map the interaction surface, generate hypotheses, generate the cross-change test, and confirm the collision is classified correctly.

### Files and directories (artifacts produced, not authored)

```
runs/<run-id>/
  manifest.json
  intents/
    coupon.json
    payment-retry.json
  diffs/
    coupon.diff
    payment-retry.diff
  workspaces.json
  test-results/
    base.json
    change-a.json
    change-b.json
    combined.json
  interaction-surfaces.json
  hypotheses.json
  generated-tests/
    coupon-payment-retry.test.ts
  collision-evidence.json
```

### Implementation tasks

1. **Register the run** via `register_run` MCP tool with the checkout scenario config.

2. **Prepare workspaces** via `prepare_workspaces`. Confirm all four workspaces are created and no textual conflict is reported.

3. **Run existing tests** via `run_existing_tests` in all four workspaces. All must pass (base, change-a, change-b, combined).

4. **Extract intent contracts** — invoke the `extract-intent-contract` Skill for each change. Verify the output JSON contains at minimum:
   - `COUPON-1`, `COUPON-2`, `COUPON-3` from the coupon prompt.
   - `PAYMENT-1`, `PAYMENT-2`, `PAYMENT-3` from the payment-retry prompt.

5. **Discover interactions** — invoke the `discover-interactions` Skill. Verify the output includes at least one hypothesis covering `Order.total` and checkout finalization as shared surfaces, with risk rated `high`.

6. **Generate the interaction test** — invoke the `generate-interaction-tests` Skill for the top-ranked hypothesis. The generated test must:
   - Import from `examples/checkout/src/`.
   - Exercise both coupon application and payment retry in one test.
   - Assert that `countAppliedDiscounts(orderId) === 1` after a retry.
   - Fail when run against the merged branches.

7. **Classify the collision** — call `run_generated_test`. Verify the response classification is `confirmed-collision` (not `test-invalid`). Save `collision-evidence.json`.

### Tests

- Intent contracts contain all six minimum requirement IDs.
- At least one hypothesis names `checkout finalization` or `Order.total` as a shared surface.
- The generated test file compiles (no import errors).
- The generated test fails on the merged branches for the predicted reason (double discount), not for an unrelated setup error.

### Exit criteria

- `collision-evidence.json` exists with `classification: "confirmed-collision"`.
- The generated test failure message matches the predicted violation (`COUPON-2`, `PAYMENT-2`).
- All existing tests still pass (the generated test has not been added to the main test suite yet).

### Dependencies

M4 (Bob mode and Skills must be operational).

---

## M6 — Collision repair and verification

**Status:** `[ ] pending`

### Objective

Use Bob to diagnose the root cause, apply a minimal repair in the combined workspace only, verify the repair against all test categories, and export the patch.

### Files and directories (artifacts produced)

```
runs/<run-id>/
  repair.patch
  repair-summary.md
  test-results/
    repaired-existing.json
    repaired-interaction.json
  stability.json
```

### Implementation tasks

1. **Diagnose** — invoke the `repair-collision` Skill. Bob must produce a written root-cause diagnosis stating:
   - The conflicting assumptions (checkout finalization is not idempotent; coupon application has no guard).
   - Which requirements are violated (`COUPON-2`, `PAYMENT-2`).
   - Why existing tests missed it (neither branch tested the combined behavior).
   - The minimal repair strategy (finalize order total before payment; guard coupon application).

2. **Apply the repair** in the combined workspace only. Candidate approaches (Bob chooses):
   - Finalize the order total atomically before payment execution and persist the finalized state.
   - Guard coupon application with a uniqueness check per `(orderId, couponCode)`.
   - Make the retry path return the persisted payment result without re-running checkout finalization.

3. **Verify the repair** — call `run_existing_tests` in the combined workspace. All original tests must pass.

4. **Run the generated interaction test** — call `run_generated_test`. The test must now pass.

5. **Run stability verification** — call `run_stability_matrix` with 50 iterations, concurrency 4, seed 20260926. All iterations must pass after the repair.

6. **Export the patch** — call `export_resolution_patch`. Verify `repair.patch` is valid and applies cleanly.

### Tests

- All original existing tests pass after repair (same count as before).
- The generated cross-change test passes after repair.
- `stability.json` records `failed: 0` out of 50 iterations.
- `repair.patch` applies cleanly to the pre-repair combined workspace and produces passing tests.
- No original test has been weakened or removed.

### Exit criteria

```
Original existing tests:          PASS (same count as before repair)
Generated interaction test:       PASS
Stability (50 iterations):        50/50 PASS
repair.patch:                     applies cleanly
```

### Dependencies

M5 (confirmed collision evidence must exist before repair).

---

## M7 — Merge Safety Passport

**Status:** `[ ] pending`

### Objective

Assemble the complete evidence artifact from the run into a human-readable and machine-readable Merge Safety Passport.

### Files and directories (artifacts produced)

```
runs/<run-id>/
  passport.json
  passport.html
```

### Implementation tasks

1. **Invoke the `generate-merge-passport` Skill.** Bob assembles the passport from all artifacts in `runs/<run-id>/`.

2. **`passport.json` must include:**
   - Run ID and timestamp.
   - Both change IDs and their resolved commit SHAs.
   - Requirements extracted for each change (by ID).
   - All test results (base, change-a, change-b, combined, repaired, stability).
   - Collision evidence referencing the generated test file.
   - Violated requirement IDs (`COUPON-2`, `PAYMENT-2`).
   - Repair summary.
   - Stability result (50/50).
   - Verdict: `SAFE_TO_MERGE`.

3. **`passport.html`** must render a human-readable summary matching the format in `BUILD_GUIDE.md §18`. A judge must be able to understand the problem, evidence, repair, and verdict in approximately 20 seconds.

4. **Verdict validation** — `passport.ts` must refuse to produce a `SAFE_TO_MERGE` verdict unless all of the following are present: passing repaired test results, passing generated interaction test, `stability.json` with `failed: 0`.

### Tests

- `passport.json` schema validates against the assembled data model from `BUILD_GUIDE.md §14`.
- All six required sections are present: inputs, requirements, test results, collision evidence, repair, stability.
- Verdict is exactly `SAFE_TO_MERGE` given a full successful run.
- `passport.ts` returns `INSUFFICIENT_EVIDENCE` if stability results are missing.

### Exit criteria

- `passport.json` is valid JSON and passes schema validation.
- `passport.html` renders correctly in a browser and contains the full investigation summary.
- The verdict section clearly states `SAFE TO MERGE` with supporting evidence counts.

### Dependencies

M6 (all verification must be complete before the passport can be assembled).

---

## M8 — Dashboard

**Status:** `[ ] pending`

### Objective

Build a lightweight visual dashboard that reads `passport.json` and presents the investigation results across five screens. The dashboard has zero analysis logic.

**Do not begin this milestone until M1 through M7 are stable and the golden scenario runs reliably end-to-end.**

### Files and directories

```
packages/dashboard/
  package.json
  tsconfig.json
  vite.config.ts         # or equivalent static build config
  src/
    main.tsx             # or index.html for static version
    components/
      ChangeOverview.tsx
      IntentMap.tsx
      InvestigationView.tsx
      RepairView.tsx
      PassportView.tsx
    passport.ts          # typed loader for passport.json
```

### Screens

Implement the five screens from `BUILD_GUIDE.md §19`:

1. **Change overview** — pass/fail matrix for base, A, B, combined.
2. **Intent map** — original prompts, requirements, shared entities, shared side effects.
3. **Investigation** — hypothesis, requirement IDs, generated test source, expected vs. observed behavior, failure log excerpt.
4. **Repair** — root cause, modified files, diff, explanation.
5. **Passport** — before/after test counts, stability results, verdict.

### Design rules (from spec §19)

- Clear dark-on-light or accessible dark theme.
- Red only for confirmed failure; green only for verified success.
- Requirement IDs displayed consistently throughout.
- Before/after transition visually obvious on the Repair screen.
- No raw log dumps on screen — excerpts only.

### Tests

- Dashboard renders without errors given a valid `passport.json` fixture.
- Dashboard shows an error state gracefully given a missing or malformed `passport.json`.

### Exit criteria

- Opening `passport.html` (or running the Vite dev server) shows all five screens populated from the checkout run's `passport.json`.
- A first-time viewer can identify the collision, the violated requirements, and the verdict within 20 seconds.

### Dependencies

M7 (dashboard requires a complete `passport.json` to render).

---

## M9 — Submission preparation

**Status:** `[ ] pending`

### Objective

Harden the demonstration, produce the required submission artifacts, and verify the full workflow runs reliably from a clean clone.

### Files and directories

```
README.md
docs/
  architecture.md
  demo-script.md
  limitations.md
bob_sessions/
  <teamname>_task01_architecture_summary.png
  <teamname>_task02_checkout_base_summary.png
  <teamname>_task03_agent_changes_summary.png
  <teamname>_task04_mcp_server_summary.png
  <teamname>_task05_intent_analysis_summary.png
  <teamname>_task06_collision_test_summary.png
  <teamname>_task07_repair_verification_summary.png
  <teamname>_task08_submission_review_summary.png
```

### Implementation tasks

1. **`README.md`** — cover: what Jointly is, how to install (`pnpm install`, build), how to update `.bob/mcp.json` with the local absolute path, how to run the checkout demo, how to open the passport, and a note that `bob_sessions/` contains IBM Bob usage evidence required for submission.

2. **`docs/demo-script.md`** — write a step-by-step script for a live demonstration covering all stages: register run → prepare workspaces → existing tests → intent extraction → hypothesis → generated test → collision → repair → stability → passport. Include expected output at each step.

3. **`docs/architecture.md`** — document the responsibility split between Bob (AI reasoning) and the Jointly MCP server (deterministic execution), the workspace isolation strategy, and the artifact directory layout.

4. **`docs/limitations.md`** — honestly document MVP scope: two changes only, TypeScript only, local execution only, no auto-merge, no universal semantic correctness guarantee.

5. **Verify `bob_sessions/` is complete.** All eight named screenshot files must be present with the correct filename pattern. Screenshots must have been collected progressively during M1–M8, not reconstructed. Submission readiness must be treated as failed if any required screenshot is missing.

6. **Run three complete rehearsals** of the demo script from a clean workspace. Fix any flakiness before submission.

7. **Save a backup run** — keep one complete `runs/<run-id>/` directory committed (or archived) so the demonstration can proceed from a known good state if live execution fails.

8. **Record a backup demo video** showing the full workflow working end-to-end.

9. **Verify no external network dependencies** — the complete demonstration must work offline (no remote Git, no external APIs, no cloud services).

### Tests

- Clean clone + `pnpm install` + `pnpm build` succeeds.
- `npm run jointly -- analyze` against the checkout scenario produces a complete `runs/<run-id>/` directory.
- Full Bob-assisted workflow produces `passport.json` with verdict `SAFE_TO_MERGE`.
- `bob_sessions/` contains all eight required PNG files named according to the convention above.

### Exit criteria

- Three successful rehearsals with no failures or manual interventions.
- All submission artifacts exist: README, demo script, architecture doc, limitations doc, backup run, backup video.
- `bob_sessions/` directory exists and contains all eight required screenshot files with correct filenames. **Submission is not ready if any screenshot is missing.**
- The demonstration runs without any external network dependencies.

### Dependencies

M1 through M8 all complete and stable.

---

## Appendix: Key file cross-references

| Topic | Location in spec |
|---|---|
| Full data model interfaces | `BUILD_GUIDE.md §14` |
| Full repository tree | `BUILD_GUIDE.md §11` |
| MCP tool input/output contracts | `BUILD_GUIDE.md §13` |
| Bob mode and Skills config | `BUILD_GUIDE.md §12` |
| Checkout scenario details | `BUILD_GUIDE.md §7` |
| Stability defaults | `BUILD_GUIDE.md §13`, `BUILD_GUIDE.md §6 Stage 13` |
| Passport verdict strings | `BUILD_GUIDE.md §18` |
| Dashboard screen specs | `BUILD_GUIDE.md §19` |
| Implementation phase order | `BUILD_GUIDE.md §20` |
