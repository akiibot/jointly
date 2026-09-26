# Jointly

## Complete Product and Build Guide

> **Jointly finds the bugs that live between independently correct AI-generated changes.**

**Product category:** Intent-aware integration testing for parallel AI-generated code  
**Hackathon:** IBM Bob 2.0 Hackathon  
**Primary platform:** IBM Bob IDE  
**Recommended implementation stack:** TypeScript, Node.js, Vitest, SQLite or in-memory persistence, local MCP server, lightweight React/Vite or static HTML report viewer

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [What Jointly is](#2-what-jointly-is)
3. [The problem](#3-the-problem)
4. [What Jointly does](#4-what-jointly-does)
5. [Core concepts and terminology](#5-core-concepts-and-terminology)
6. [Complete end-to-end workflow](#6-complete-end-to-end-workflow)
7. [Primary demonstration scenario](#7-primary-demonstration-scenario)
8. [Additional use cases](#8-additional-use-cases)
9. [MVP scope and non-goals](#9-mvp-scope-and-non-goals)
10. [Technical architecture](#10-technical-architecture)
11. [Repository structure](#11-repository-structure)
12. [IBM Bob integration](#12-ibm-bob-integration)
13. [Jointly MCP server](#13-jointly-mcp-server)
14. [Data models and schemas](#14-data-models-and-schemas)
15. [Git workspace strategy](#15-git-workspace-strategy)
16. [Test-generation strategy](#16-test-generation-strategy)
17. [Repair and verification strategy](#17-repair-and-verification-strategy)
18. [Merge Safety Passport](#18-merge-safety-passport)
19. [Dashboard](#19-dashboard)
20. [Complete implementation roadmap](#20-complete-implementation-roadmap)
21. [Engineering backlog](#21-engineering-backlog)
22. [Testing and quality plan](#22-testing-and-quality-plan)
23. [Risks and mitigations](#23-risks-and-mitigations)
24. [Security and safety](#24-security-and-safety)
25. [Metrics and business value](#25-metrics-and-business-value)
26. [Hackathon presentation plan](#26-hackathon-presentation-plan)
27. [Submission checklist](#27-submission-checklist)
28. [Suggested Bob prompts](#28-suggested-bob-prompts)
29. [Future roadmap](#29-future-roadmap)
30. [Definition of done](#30-definition-of-done)
31. [Immediate next steps](#31-immediate-next-steps)
32. [Official references](#32-official-references)

---

# 1. Executive summary

Jointly is an intent-aware pre-merge verification system for changes produced by parallel AI coding agents.

It analyzes two independently developed changes and answers:

1. Does each change work independently?
2. What was each change originally supposed to accomplish?
3. Which APIs, entities, functions, side effects, or business invariants do the changes share?
4. Does the combined implementation still satisfy both original intentions?
5. Which important interaction tests are missing?
6. Can IBM Bob reproduce and explain any hidden conflict?
7. Can IBM Bob create a compatible repair?
8. Does the repair remain stable across retries, concurrency, and repeated execution?

The main demonstration is:

```text
Change A alone                         PASS
Change B alone                         PASS
A + B with the existing test suite     PASS
Bob-generated interaction test         FAIL
Bob-generated repair                   APPLIED
Original tests after repair            PASS
Interaction tests after repair         PASS
Stability verification                 50/50 PASS
Final verdict                          SAFE TO MERGE
```

Jointly combines the strongest parts of several concepts into one coherent product:

- The original semantic-merge concept supplies the core problem.
- Prompt-aware analysis extracts intent from the tasks that produced each change.
- Agent-collision analysis focuses the product on parallel AI development.
- Stability verification proves the repair repeatedly instead of accepting one green test.

These are not separate products. They are stages in one Jointly workflow.

## One-sentence pitch

> Jointly reads the prompts behind parallel AI-generated changes, uses IBM Bob to create the interaction tests neither agent knew to write, repairs hidden intent collisions, and proves the combined code is safe to merge.

## Short tagline

> **Build separately. Ship safely. Jointly.**

## Alternative technical tagline

> **The bugs live between the branches.**

---

# 2. What Jointly is

Jointly is an **intent-aware integration gate** for AI-generated code.

It sits conceptually between feature implementation and merge approval:

```text
AI Agent A -> Change A --\
                        +--> Jointly --> Verified repair --> Merge decision
AI Agent B -> Change B --/
```

Jointly is not primarily a source-control merge-conflict resolver.

Traditional Git detects:

```text
Both branches modified line 47.
```

Jointly is designed to detect:

```text
Change A modifies coupon calculation.
Change B modifies payment retry behavior.

The changes touch different lines and merge cleanly, but a payment retry
causes the coupon to be applied twice.
```

That is a semantic or behavioral collision.

## Product boundaries

Jointly is:

- A focused investigator for interactions between independently produced changes.
- Prompt-aware: it considers why a change exists, not only what its diff contains.
- Evidence-driven: a confirmed collision requires an executable reproduction.
- Bob-native: IBM Bob performs the reasoning, test generation, diagnosis, repair, and verification workflow.
- Safe by default: analysis and repair happen in isolated temporary workspaces.

Jointly is not:

- A universal formal-verification system.
- A replacement for normal unit, integration, security, or performance testing.
- A promise to detect every possible semantic defect.
- An automatic production-merge bot.
- A generic AI code reviewer with a different name.
- A dashboard that only summarizes existing test results.

## Credible product promise

Do not claim:

> Jointly finds every semantic conflict.

Claim:

> Jointly uses change intent and repository context to generate high-risk interaction tests that ordinary branch-level testing misses.

---

# 3. The problem

AI coding tools make it easy to implement multiple features in parallel:

```text
Agent A -> Feature A -> Agent A tests -> PASS
Agent B -> Feature B -> Agent B tests -> PASS
```

However, each agent normally reasons about:

- Its own prompt
- Its own patch
- The repository state it was given
- Its own local tests
- Its own assumptions about shared state

The agent does not reliably know what another agent changed or assumed.

After combining the work:

```text
Feature A + Feature B -> Unexpected system behavior
```

## Why existing tools may miss the problem

A hidden interaction can remain undetected even when:

- Git reports no textual conflict.
- The project compiles.
- Static analysis is clean.
- Each branch has passing tests.
- The combined existing test suite passes.
- Each pull request has high local coverage.
- Both changes appear reasonable during isolated review.

The missing artifact is usually a test that combines the intentions of both changes.

## Common collision categories

### State collision

Both changes read or write the same state with incompatible assumptions.

### Contract collision

One change modifies the meaning or lifecycle of an API, event, schema, or function used by the other.

### Temporal collision

The behavior fails only under a particular ordering, retry, timeout, or concurrent execution.

### Side-effect collision

Combined changes duplicate a payment, notification, reservation, database mutation, or external call.

### Authorization collision

One feature introduces a route or operation that does not follow the authorization model introduced by another change.

### Data-lifecycle collision

One change migrates, renames, caches, deletes, or finalizes data while another still relies on the previous lifecycle.

### Intent collision

The combined code technically functions but violates one or more requirements from the original tasks.

---

# 4. What Jointly does

## Inputs

For each change, Jointly accepts:

- A common base Git revision
- A branch, commit, or patch
- The original prompt, issue, or ticket
- Optional acceptance criteria
- The repository test command
- Optional project-specific invariants
- Optional stability scenarios

Example configuration:

```yaml
project:
  name: jointly-checkout-demo
  root: ./examples/checkout

base:
  ref: main

changes:
  - id: coupon
    ref: agent/coupon
    promptFile: scenarios/checkout/coupon-prompt.md

  - id: payment-retry
    ref: agent/payment-retry
    promptFile: scenarios/checkout/payment-retry-prompt.md

commands:
  install: npm install
  test: npm test -- --run
  interactionTest: npm run test:interaction

stability:
  iterations: 50
  concurrency: 4
  seed: 20260926
```

## Outputs

Jointly produces:

- Independent branch test results
- Combined existing-test results
- Intent contract for each change
- Prompt-to-code traceability
- Shared interaction-surface map
- Ranked collision hypotheses
- Generated cross-change tests
- Reproduction evidence
- Root-cause explanation
- Proposed repair
- Exportable repair patch
- Repeated stability results
- Human-readable Merge Safety Passport
- Machine-readable `passport.json`

---

# 5. Core concepts and terminology

## Change package

A normalized record containing:

- Change ID
- Base revision
- Branch, commit, or patch reference
- Original prompt or ticket
- Acceptance criteria
- Diff metadata
- Test commands

## Intent contract

A structured collection of observable requirements extracted from the original task.

An intent contract is not a prose summary. Every important statement must be testable or verifiable.

Example:

```json
{
  "changeId": "coupon",
  "goal": "Support percentage-based coupons",
  "requirements": [
    {
      "id": "COUPON-1",
      "statement": "A valid coupon reduces the pretax subtotal",
      "type": "business-rule",
      "entities": ["Order", "Coupon", "OrderTotal"],
      "observableOutcome": "The discount is applied before tax"
    },
    {
      "id": "COUPON-2",
      "statement": "A coupon affects an order at most once",
      "type": "invariant",
      "entities": ["Order", "Coupon"],
      "observableOutcome": "One discount record exists for the order"
    }
  ]
}
```

## Interaction surface

A code or domain element used by both changes, including:

- File
- Function
- Class
- Module
- API endpoint
- Database table or field
- Event
- Queue
- State transition
- Domain entity
- Side effect
- Business invariant

## Collision hypothesis

A specific, testable prediction that the changes may violate one or more requirements when combined.

Example:

```json
{
  "id": "HYP-1",
  "changeIds": ["coupon", "payment-retry"],
  "requirementIds": ["PAYMENT-3"],
  "sharedSurface": ["Order.total", "Order.discountAmount", "financial-total invariant", "payment replay"],
  "explanation": "A same-key replay on a valid discounted order may be rejected instead of returning the original payment",
  "risk": "high",
  "scenario": [
    "Create order",
    "Apply coupon",
    "Finalize checkout",
    "Submit a keyed payment",
    "Replay with the same idempotency key",
    "Compare HTTP status and payment identity"
  ]
}
```

## Confirmed collision

A hypothesis becomes a confirmed collision only when:

1. An executable test reproduces the behavior.
2. The observed behavior differs from the expected behavior.
3. The violation maps to requirements from the original changes.

## Merge Safety Passport

The final evidence artifact containing:

- Inputs
- Requirements
- Test results
- Collision evidence
- Repair
- Stability results
- Final verdict

---

# 6. Complete end-to-end workflow

## Stage 1: Register the run

The user provides:

- Base revision
- Change A reference
- Change B reference
- Prompt or ticket for each change
- Test commands

Jointly validates:

- Repository exists
- Base revision resolves
- Both changes resolve
- Both changes originate from the same base for the MVP
- Prompt files exist
- Commands are explicitly configured

Output:

```text
runs/<run-id>/manifest.json
```

## Stage 2: Prepare isolated workspaces

Create four isolated environments:

```text
Base workspace       = Base
Change A workspace   = Base + A
Change B workspace   = Base + B
Combined workspace   = Base + A + B
```

Never perform analysis by destructively switching the developer's working branch.

## Stage 3: Run existing tests

Run the configured tests in:

1. Base
2. Change A
3. Change B
4. Combined

Ideal demonstration state:

```text
Base tests:                       PASS
Change A tests:                   PASS
Change B tests:                   PASS
Combined existing tests:          PASS
```

If A or B fails independently, stop semantic comparison and report the branch as already broken.

If the changes have a textual merge conflict, classify it separately. A textual conflict is not the main Jointly innovation.

## Stage 4: Extract intent contracts

IBM Bob reads each prompt independently and extracts:

- Goal
- Functional requirements
- Business invariants
- Negative cases
- Security or authorization expectations
- Compatibility expectations
- Entities
- Side effects
- Observable outcomes
- Ambiguities and assumptions

Every requirement receives a stable ID.

## Stage 5: Inspect and map both diffs

Bob maps each requirement to:

- Changed files
- Functions and methods
- API handlers
- Models and schemas
- Database fields
- Events
- Tests
- Side effects

Example:

```text
COUPON-2
  -> src/services/coupon.ts
  -> src/services/checkout.ts
  -> orders.discount_total

PAYMENT-2
  -> src/services/payment.ts
  -> src/services/checkout.ts
  -> orders.total
```

## Stage 6: Discover interaction surfaces

Signals include:

- Directly shared files or symbols
- One change writing data the other reads
- Shared database entities
- Shared routes or services
- Shared domain language in prompts
- Execution-order relationships
- Retry or idempotency boundaries
- Shared side effects
- State-machine transitions

Create a structured interaction map rather than relying on one long AI explanation.

## Stage 7: Generate collision hypotheses

For every meaningful interaction surface, Bob proposes:

- What might fail
- Why it might fail
- Which requirements are at risk
- A minimal scenario that can prove or reject the hypothesis
- Risk level

Limit the MVP to the highest-risk one or two hypotheses.

## Stage 8: Generate interaction tests

Bob converts a hypothesis into an executable test using the repository's existing testing conventions.

The generated test must:

- Reference requirements from both changes
- Exercise behavior from both changes
- Avoid network dependencies
- Use deterministic values
- Contain a clear expected result
- Fail for the predicted reason
- Pass after a correct repair

## Stage 9: Execute and classify

Run the generated test in the combined workspace.

Possible classifications:

- `confirmed-collision`
- `hypothesis-rejected`
- `test-invalid`
- `environment-failure`
- `textual-conflict`
- `independent-change-failure`

Do not label a generated test compile failure as a semantic collision.

## Stage 10: Diagnose the root cause

Bob receives:

- Both intent contracts
- Both diffs
- Interaction map
- Failing generated test
- Failure output
- Relevant source files

The diagnosis must state:

- The conflicting assumptions
- The precise state transition or contract that failed
- Requirements violated
- Why existing tests missed it
- The smallest compatible repair strategy

## Stage 11: Apply a repair

Bob edits only the isolated combined workspace.

The repair should:

- Preserve the intent of both changes
- Avoid removing either feature
- Avoid modifying tests merely to hide the failure
- Be as small as practical
- Include a regression test
- Be exportable as a patch

## Stage 12: Verify the repair

Run:

1. Original repository tests
2. Change A tests
3. Change B tests
4. Generated interaction tests
5. Stability scenarios

The repair is rejected if it breaks an original test or invalidates a requirement from either change.

## Stage 13: Run stability verification

Use only scenarios relevant to the demonstrated defect:

- Duplicate requests
- Concurrent requests
- Random short delays
- Repeated execution
- Reordered tests
- Fixed random seeds
- Negative inputs

Suggested MVP configuration:

```text
Iterations:     50
Concurrency:     4
Seed:       fixed
Timeout:    bounded
```

## Stage 14: Export evidence

Produce:

- `passport.json`
- `passport.html`
- `repair.patch`
- Test logs
- Intent contracts
- Hypotheses
- Generated tests
- Stability results

---

# 7. Primary demonstration scenario

Use a small e-commerce checkout backend.

## Base application

The base application should contain:

- Products
- Orders
- Checkout service
- Tax calculation
- In-memory or SQLite persistence
- Basic API endpoints
- Unit tests
- Integration-test setup

The frontend is optional. Do not let frontend work delay the analysis workflow.

## Change A: Coupon support

Prompt:

> Add percentage-based coupons to checkout. Discounts must apply before tax. A coupon can affect an order only once. Invalid coupons must not modify the order.

Possible files:

```text
src/services/coupon-service.ts
src/services/order-service.ts
tests/coupon.test.ts
```

Expected local tests:

- Valid coupon reduces subtotal
- Invalid coupon changes nothing
- Percentage calculation is correct

The local test intentionally does not include payment retries.

## Change B: Payment retry support

Prompt:

> Add idempotent payment retries. Requests with the same idempotency key must return the same payment result, must not create another payment, and must not modify the finalized order.

Possible files:

```text
src/services/payment-service.ts
src/repositories/payment-store.ts
tests/payment-retry.test.ts
```

Expected local tests:

- Duplicate request returns the original payment
- Only one payment record exists
- Different keys create different payment attempts

The local test intentionally does not use coupons.

## Hidden interaction

The payment-retry feature encodes a financial-integrity guard on the replay path. When a same-key payment request arrives, the service finds the existing payment and verifies that `order.total === order.subtotal + order.tax` before returning it. This guard assumes the pre-coupon invariant.

The coupon feature legitimately changes the order-total contract: after discount application, `order.total = order.subtotal − order.discountAmount + order.tax`. A discounted order satisfies its own invariant but fails the uncoupled guard hardcoded in the replay path.

Result:

- Coupon branch passes alone.
- Payment branch passes alone.
- Git merges the changes cleanly — no textual conflict.
- All 58 existing combined tests pass.
- A same-key payment replay on a discounted order returns HTTP 400 instead of returning the original successful payment.
- No duplicate payment is created and the finalized order is not modified; only the same-key retry contract is violated.

## Expected intent contracts

Coupon requirements:

```text
COUPON-1: A valid coupon reduces the pretax subtotal.
COUPON-2: A coupon affects an order at most once.
COUPON-3: An invalid coupon does not modify the order.
```

Payment requirements:

```text
PAYMENT-1: A duplicate request creates no additional payment.
PAYMENT-2: A retry does not modify the order total.
PAYMENT-3: The same idempotency key returns the original result.
```

## Expected generated interaction test

```ts
it("returns the original payment when a keyed payment is replayed on a discounted order", async () => {
  const order = await createOrder();
  // Add items totalling 4000 cents
  await addItems(order.id, 4, 1000);
  await applyCoupon(order.id, "SAVE10");
  await finalizeOrder(order.id);
  // Verify coupon-aware financials
  // subtotal 4000, discountAmount 400, tax 360, total 3960

  const first = await pay(order.id, { idempotencyKey: "jointly-demo" });
  expect(first.status).toBe(201);
  expect(first.amount).toBe(3960);

  const replay = await pay(order.id, { idempotencyKey: "jointly-demo" });
  expect(replay.status).toBe(201);            // must not be 400
  expect(replay.paymentId).toBe(first.paymentId);  // same payment returned
  expect(replay.amount).toBe(first.amount);   // no change to amount
});
```

The generated test must fail on the uncorrected combined implementation because the replay path rejects the discounted total via its legacy financial-integrity guard, returning HTTP 400 instead of the original payment.

## Expected failure evidence

```text
AssertionError: expected 400 to be 201

The payment-replay path validated:
  order.total (3960) !== order.subtotal (4000) + order.tax (360)
and threw a financial integrity error.

Violated requirements:
- PAYMENT-3: The same idempotency key returns the original result.
```

## Expected repair

A reasonable repair may:

- Remove or generalise the integrity guard in the replay path so it respects the coupon-aware invariant (`total = subtotal − discountAmount + tax`).
- Return the persisted payment result directly without re-validating the total.
- Store the expected total at payment-creation time and compare against the stored value on replay rather than recomputing from fields.

Do not prescribe one mandatory repair strategy. Bob should diagnose and choose the minimal correct fix in the combined workspace. Do not hard-code the repair in the Jointly engine.

## Target demonstration metrics

```text
Requirements extracted:       8
Shared contracts found:        3
Hypotheses generated:          2
Interaction tests generated:   2 or 3
Confirmed collisions:          1
Failures before repair:       23/50
Failures after repair:         0/50
Original tests preserved:     42/42
```

Use real measured numbers in the final submission. Do not claim these example numbers unless your actual run produces them.

---

# 8. Additional use cases

These are roadmap examples. Do not implement all of them during the MVP.

## Authorization and data export

- Change A adds an export endpoint.
- Change B revises role permissions.
- Both work independently.
- The export endpoint follows the old permission model and exposes restricted records.

## Caching and profile updates

- Change A introduces read caching.
- Change B adds profile editing.
- Updates succeed, but reads remain stale because invalidation is missing.

## Database migration and background worker

- Change A renames a column.
- Change B introduces a worker that still writes the old field.
- Deployment succeeds, but asynchronous processing fails.

## Feature flags and authorization

- Change A places a route behind a feature flag.
- Change B modifies authorization middleware.
- Enabling the flag bypasses the intended authorization path.

## Inventory reservation and payment retries

- Change A reserves stock during checkout.
- Change B retries payment requests.
- Retrying creates multiple inventory reservations.

## Event producer and event consumer

- Change A changes the business meaning of an event field.
- Change B introduces a consumer using the old meaning.
- Types still match, but behavior is wrong.

## Localization and validation

- Change A adds locale-aware number parsing.
- Change B validates prices using fixed decimal assumptions.
- Some locales receive incorrect totals.

## API evolution and client generation

- Change A changes an API field from optional to required.
- Change B generates a client that assumes the previous schema.
- Both compile separately but fail at runtime together.

---

# 9. MVP scope and non-goals

## Required MVP scope

Support exactly:

- One TypeScript repository
- One common base revision
- Two prompts
- Two branches or commits
- One checkout scenario
- One semantic collision
- One Bob-generated interaction test
- One Bob-generated repair
- One stability matrix
- One Merge Safety Passport

## Optional if the MVP is already stable

- A second safe branch pair that produces no confirmed collision
- A small visual dependency or intent map
- Exported patch download
- A polished report viewer

## Explicit non-goals

- Every programming language
- Arbitrary numbers of branches
- Full GitHub App installation
- Universal semantic correctness
- Production auto-merge
- Enterprise authentication
- Remote execution farm
- A complete static analyzer
- A generic chatbot interface

---

# 10. Technical architecture

## Recommended stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Tests:** Vitest
- **Sample API:** Fastify or Express
- **Persistence:** SQLite or an in-memory repository
- **Agent integration:** IBM Bob IDE
- **Tool integration:** Local STDIO MCP server
- **Dashboard:** React/Vite or generated static HTML
- **Source control operations:** Git CLI
- **Configuration:** YAML
- **Artifacts:** JSON, Markdown, HTML, patch files

## System diagram

```text
IBM Bob IDE
  |
  |-- AI Merge Investigator custom mode
  |-- Jointly skills
  |-- Focused subagents
  `-- Jointly MCP tools
             |
             v
       Jointly Core
        |-- Configuration loader
        |-- Change registry
        |-- Git workspace manager
        |-- Command/test runner
        |-- Evidence collector
        |-- Stability runner
        `-- Passport generator
             |
             v
      Isolated workspaces
        |-- Base
        |-- Change A
        |-- Change B
        `-- Combined + repaired
```

## Responsibility split

### IBM Bob performs

- Prompt understanding
- Requirement extraction
- Interaction reasoning
- Hypothesis generation
- Test design and creation
- Failure diagnosis
- Repair generation
- Verification reasoning
- Human-readable explanation

### Jointly MCP server performs

- Repository validation
- Workspace creation
- Diff retrieval
- Command execution
- Test-output capture
- Stability execution
- Evidence persistence
- Patch export
- Passport rendering

The MCP server should be deterministic. It should not pretend to perform AI reasoning.

---

# 11. Repository structure

```text
jointly/
|-- README.md
|-- LICENSE
|-- package.json
|-- tsconfig.base.json
|-- jointly.yaml
|-- AGENTS.md
|
|-- .bob/
|   |-- custom_modes.yaml
|   |-- mcp.json
|   |-- rules-ai-merge-investigator/
|   |   |-- 01-investigation-rules.md
|   |   |-- 02-test-generation-rules.md
|   |   |-- 03-repair-rules.md
|   |   `-- 04-evidence-requirements.md
|   `-- skills/
|       |-- extract-intent-contract/
|       |   |-- SKILL.md
|       |   `-- intent-schema.json
|       |-- discover-interactions/
|       |   |-- SKILL.md
|       |   `-- collision-checklist.md
|       |-- generate-interaction-tests/
|       |   |-- SKILL.md
|       |   `-- test-quality-checklist.md
|       |-- repair-collision/
|       |   |-- SKILL.md
|       |   `-- repair-policy.md
|       `-- generate-merge-passport/
|           |-- SKILL.md
|           `-- passport-template.md
|
|-- packages/
|   |-- core/
|   |   |-- package.json
|   |   `-- src/
|   |       |-- config.ts
|   |       |-- manifest.ts
|   |       |-- changes.ts
|   |       |-- workspace.ts
|   |       |-- git.ts
|   |       |-- runner.ts
|   |       |-- evidence.ts
|   |       |-- stability.ts
|   |       `-- passport.ts
|   |
|   |-- mcp-server/
|   |   |-- package.json
|   |   `-- src/
|   |       |-- server.ts
|   |       `-- tools/
|   |           |-- register-run.ts
|   |           |-- prepare-workspaces.ts
|   |           |-- read-change-diff.ts
|   |           |-- run-tests.ts
|   |           |-- run-stability.ts
|   |           |-- export-patch.ts
|   |           `-- generate-passport.ts
|   |
|   `-- dashboard/
|       |-- package.json
|       `-- src/
|
|-- examples/
|   `-- checkout/
|       |-- package.json
|       |-- src/
|       |-- tests/
|       `-- README.md
|
|-- scenarios/
|   `-- checkout/
|       |-- coupon-prompt.md
|       |-- payment-retry-prompt.md
|       |-- project-invariants.md
|       `-- expected-collision.md
|
|-- runs/
|   `-- .gitkeep
|
|-- docs/
|   |-- architecture.md
|   |-- demo-script.md
|   `-- limitations.md
|
`-- bob_sessions/
    `-- README.md
```

---

# 12. IBM Bob integration

IBM Bob must be central to the product workflow, not only the tool used to write the code.

## Project custom mode

File:

```text
.bob/custom_modes.yaml
```

Starting configuration:

```yaml
customModes:
  - slug: ai-merge-investigator
    name: Jointly - AI Merge Investigator
    description: Detect and repair intent collisions between independently generated changes.
    roleDefinition: |
      You are an integration investigator specializing in semantic conflicts
      between independently developed AI-generated changes.
    whenToUse: |
      Use this mode when two changes must be verified independently and in
      combination before they are approved for merge.
    customInstructions: |
      Never declare a merge safe solely because the existing test suite passes.
      Extract observable requirements from every supplied task or prompt.
      Every confirmed collision must include an executable reproduction.
      Never treat a generated-test compile error as a confirmed collision.
      Every repair must preserve the intent and existing tests of both changes.
      Apply repairs only in the isolated combined workspace.
      Produce evidence that can be included in the Merge Safety Passport.
    groups:
      - read
      - edit
      - execute
      - mcp
      - skill
      - subagent
```

Verify exact configuration compatibility with the installed Bob version before the final demonstration.

## Mode-specific rules

Directory:

```text
.bob/rules-ai-merge-investigator/
```

Suggested rules:

### Investigation rules

- Analyze each prompt independently before comparing changes.
- Separate facts from assumptions.
- Use stable requirement IDs.
- Rank hypotheses instead of producing an unbounded list.
- Prioritize shared state, side effects, contracts, and temporal behavior.

### Test-generation rules

- Follow existing test conventions.
- Generate the smallest useful interaction test.
- Exercise behavior from both changes.
- Make expected behavior explicit.
- Do not modify production code while generating the reproduction.

### Repair rules

- Preserve both intent contracts.
- Do not weaken assertions to achieve green tests.
- Prefer the smallest compatible change.
- Explain why the fix addresses the root cause.
- Export a reviewable patch.

### Evidence rules

- Record command, exit code, duration, and bounded output.
- Link findings to requirement IDs.
- Save generated tests.
- Save before/after results.
- Never claim a confirmed collision without reproduction evidence.

## Bob Skills

Create five focused project skills.

### Skill 1: `extract-intent-contract`

Purpose:

- Read a prompt or ticket.
- Produce structured, observable requirements.
- Identify ambiguities.
- Save JSON matching the intent schema.

### Skill 2: `discover-interactions`

Purpose:

- Compare intent contracts and diffs.
- Identify shared interaction surfaces.
- Produce ranked collision hypotheses.

### Skill 3: `generate-interaction-tests`

Purpose:

- Convert one hypothesis into an executable test.
- Follow repository test conventions.
- Link the test to requirement IDs.

### Skill 4: `repair-collision`

Purpose:

- Diagnose a confirmed collision.
- Implement the smallest compatible repair.
- Preserve both changes' intent.

### Skill 5: `generate-merge-passport`

Purpose:

- Collect run artifacts.
- Produce concise human-readable evidence.
- Avoid claims unsupported by test output.

## Suggested subagent roles

### Intent Analyst

- Reads only the supplied prompt and necessary project documentation.
- Extracts requirements and invariants.
- Does not repair code.

### Interaction Investigator

- Reads both intent contracts and diffs.
- Identifies shared contracts and collision hypotheses.
- Does not edit production code.

### Test Engineer

- Creates executable interaction tests.
- Verifies test validity.
- Does not implement the repair.

### Repair Verifier

- Reviews the diagnosis and repair independently.
- Reruns original and generated tests.
- Rejects overfitted or intent-breaking fixes.

## Bob usage evidence

Capture relevant Bob task-session summary screenshots and store them under:

```text
bob_sessions/
```

Suggested files:

```text
teamname_task01_architecture_summary.png
teamname_task02_checkout_base_summary.png
teamname_task03_agent_changes_summary.png
teamname_task04_mcp_server_summary.png
teamname_task05_intent_analysis_summary.png
teamname_task06_collision_test_summary.png
teamname_task07_repair_verification_summary.png
teamname_task08_submission_review_summary.png
```

Do not wait until submission time to collect these screenshots.

---

# 13. Jointly MCP server

Use a local STDIO MCP server for the hackathon prototype.

## Project configuration

File:

```text
.bob/mcp.json
```

Illustrative configuration:

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

Use the actual absolute project path in the local hackathon environment. Confirm the format in Bob settings before the demonstration.

## Required MCP tools

### `register_run`

Input:

```json
{
  "baseRef": "main",
  "changes": [
    {
      "id": "coupon",
      "ref": "agent/coupon",
      "promptPath": "scenarios/checkout/coupon-prompt.md"
    },
    {
      "id": "payment-retry",
      "ref": "agent/payment-retry",
      "promptPath": "scenarios/checkout/payment-retry-prompt.md"
    }
  ]
}
```

Responsibilities:

- Validate inputs
- Create run ID
- Persist manifest
- Return normalized paths and references

### `prepare_workspaces`

Responsibilities:

- Create isolated workspaces
- Apply A, B, and A+B
- Record resolved commit IDs
- Report textual merge conflicts separately

### `read_change_diff`

Responsibilities:

- Return a bounded diff
- List touched files
- Optionally list touched symbols
- Never return secrets or ignored files

### `run_existing_tests`

Responsibilities:

- Execute the configured command
- Enforce timeout
- Capture stdout and stderr
- Record duration and exit code
- Return a bounded summary and artifact path

### `run_generated_test`

Responsibilities:

- Run the selected generated test
- Distinguish compilation failure from assertion failure
- Save output and metadata

### `run_stability_matrix`

Responsibilities:

- Repeat a declared scenario
- Use fixed seeds
- Control concurrency
- Record pass/fail counts
- Preserve failing iteration details

### `collect_evidence`

Responsibilities:

- Validate required artifacts
- Normalize test results
- Link evidence to requirements and hypotheses

### `export_resolution_patch`

Responsibilities:

- Produce `repair.patch`
- Never merge directly into the source branch
- Include changed-file summary

### `generate_passport`

Responsibilities:

- Generate `passport.json`
- Generate `passport.html`
- Include only supported claims

## Tool safety rules

- Accept only validated repository-relative paths.
- Do not execute arbitrary commands supplied through prompts.
- Use allowlisted configured commands.
- Use bounded timeouts.
- Limit captured output size.
- Redact obvious secrets.
- Never operate on the user's primary branch directly.
- Store temporary workspaces beneath a dedicated run directory.

---

# 14. Data models and schemas

## Run manifest

```ts
interface RunManifest {
  runId: string;
  createdAt: string;
  repositoryRoot: string;
  baseRef: string;
  resolvedBaseCommit: string;
  changes: ChangePackage[];
  commands: RunCommands;
  stability?: StabilityConfig;
}
```

## Change package

```ts
interface ChangePackage {
  id: string;
  ref: string;
  resolvedCommit: string;
  promptPath: string;
  diffArtifact?: string;
}
```

## Intent requirement

```ts
type RequirementType =
  | "business-rule"
  | "invariant"
  | "negative-case"
  | "security"
  | "compatibility";

interface IntentRequirement {
  id: string;
  statement: string;
  type: RequirementType;
  entities: string[];
  sideEffects: string[];
  observableOutcome: string;
  source: {
    file: string;
    excerpt: string;
  };
  assumptions?: string[];
}
```

## Intent contract

```ts
interface IntentContract {
  changeId: string;
  goal: string;
  requirements: IntentRequirement[];
  entities: string[];
  sideEffects: string[];
  ambiguities: string[];
}
```

## Interaction surface

```ts
interface InteractionSurface {
  kind:
    | "file"
    | "symbol"
    | "api"
    | "database"
    | "event"
    | "state"
    | "side-effect"
    | "domain-concept";
  identifier: string;
  changeIds: string[];
  evidence: string[];
}
```

## Collision hypothesis

```ts
interface CollisionHypothesis {
  id: string;
  changeIds: string[];
  requirementIds: string[];
  sharedSurface: string[];
  explanation: string;
  risk: "low" | "medium" | "high";
  scenario: string[];
}
```

## Command result

```ts
interface CommandResult {
  commandId: string;
  workspace: "base" | "change-a" | "change-b" | "combined" | "repaired";
  command: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  stdoutArtifact: string;
  stderrArtifact: string;
}
```

## Collision evidence

```ts
interface CollisionEvidence {
  hypothesisId: string;
  classification:
    | "confirmed-collision"
    | "hypothesis-rejected"
    | "test-invalid"
    | "environment-failure";
  requirementIds: string[];
  testFile: string;
  commandResult: CommandResult;
  expected: string;
  observed: string;
}
```

## Stability result

```ts
interface StabilityResult {
  iterations: number;
  passed: number;
  failed: number;
  seed: number;
  concurrency: number;
  failedIterations: Array<{
    iteration: number;
    evidenceArtifact: string;
  }>;
}
```

## Run artifact structure

```text
runs/<run-id>/
|-- manifest.json
|-- intents/
|   |-- coupon.json
|   `-- payment-retry.json
|-- diffs/
|-- workspaces.json
|-- test-results/
|-- interaction-surfaces.json
|-- hypotheses.json
|-- generated-tests/
|-- collision-evidence.json
|-- repair.patch
|-- repair-summary.md
|-- stability.json
|-- passport.json
`-- passport.html
```

---

# 15. Git workspace strategy

## MVP assumptions

- Both changes originate from the same known base commit.
- Each change can be represented as a commit or branch.
- The demonstration repository is local.
- Analysis never modifies the original branches.

## Workspace construction

Recommended approach:

1. Resolve base, A, and B commit IDs.
2. Create isolated temporary Git worktrees or clean temporary clones.
3. Materialize Base.
4. Materialize Base + A.
5. Materialize Base + B.
6. Materialize Base + A + B.
7. Apply the repair only to the combined workspace.
8. Export the repair as a patch.

## Important classifications

### Textual conflict

Git cannot compose the changes automatically.

This is useful information but not a Jointly semantic discovery.

### Independent failure

A or B fails its own existing tests.

Stop and report that the change is not independently valid.

### Existing combined-test failure

A+B already fails the existing suite.

Jointly can still diagnose it, but the strongest demonstration is when the existing suite stays green and Jointly generates the missing test.

### Hidden semantic collision

A and B pass independently, A+B passes the existing suite, and a newly generated cross-change test exposes a requirement violation.

This is the target demonstration.

---

# 16. Test-generation strategy

## Test-generation input

Provide the Test Engineer with:

- One collision hypothesis
- Related requirement IDs
- Relevant changed files
- Existing test conventions
- Existing fixtures and helpers
- Test command

Do not provide the entire repository if a smaller context is sufficient.

## Generated-test quality checklist

- Uses the project's actual test framework
- Compiles or loads successfully
- Uses deterministic data
- Avoids uncontrolled network dependencies
- Exercises behavior from both changes
- Asserts an observable business outcome
- Includes requirement IDs in a comment or metadata
- Fails for the predicted reason before repair
- Passes after a correct repair
- Does not depend on the intentionally known implementation detail unless necessary

## Validation sequence

```text
1. Generate test
2. Parse or compile test
3. Run against Base if meaningful
4. Run against A
5. Run against B
6. Run against A+B
7. Inspect failure reason
8. Classify test as valid or invalid
```

The exact expected matrix depends on the scenario. For the checkout example, the cross-feature test may be inapplicable to A or B alone because both features are required. That is acceptable if the combined failure is clear and the test itself is valid.

## Preventing false evidence

Do not accept a test as collision evidence when it fails because of:

- Missing imports
- Invalid syntax
- Wrong endpoint name
- Incorrect test setup
- Unavailable dependency
- Timeout unrelated to the hypothesis
- Assertion against an invented requirement

---

# 17. Repair and verification strategy

## Repair constraints

The repair agent must:

- Operate only in the combined workspace
- Preserve both intent contracts
- Preserve all existing tests
- Keep the generated regression test
- Prefer the smallest root-cause fix
- Avoid disabling features
- Avoid weakening assertions
- Avoid hiding errors with broad exception handling

## Verification matrix

After repair, run:

```text
Original base tests
Change A tests
Change B tests
Combined existing tests
Generated interaction tests
Stability scenarios
```

## Independent review

Use the Repair Verifier subagent to answer:

1. Does the patch address the root cause?
2. Does it preserve Change A's requirements?
3. Does it preserve Change B's requirements?
4. Did production code change more than necessary?
5. Did any test get weakened or removed?
6. Is the stability result reproducible?

## Stability verification

For the checkout demo, exercise:

- Same idempotency key repeated sequentially
- Same idempotency key sent concurrently
- Different idempotency keys
- Valid coupon
- Invalid coupon
- No coupon
- Random short delays between operations

Use bounded iterations. Fifty runs are enough for a hackathon demonstration if they finish quickly.

---

# 18. Merge Safety Passport

## Purpose

The passport makes the technical investigation understandable in seconds.

It should answer:

- What changes were analyzed?
- What did each change intend?
- Did they pass independently?
- What shared contracts were found?
- What new test was generated?
- What failed?
- Which requirements were violated?
- What was repaired?
- What evidence supports the final verdict?

## Example

```text
JOINTLY MERGE SAFETY PASSPORT

Run: checkout-coupon-payment-001

Changes analyzed
PASS  Coupon support
PASS  Retry-safe payment processing

Intent analysis
8 requirements extracted
3 shared business contracts discovered
2 collision hypotheses generated

Confirmed collision
Same-key replay rejected a valid discounted order

Evidence
Generated test: coupon-payment-retry.test.ts
Violated requirements: PAYMENT-3
Failures before repair: 23/50

Resolution
Replay respects coupon-aware totals and returns the persisted payment result

Final verification
Original tests:       42/42 passed
Generated tests:       3/3 passed
Stability matrix:     50/50 passed

VERDICT: SAFE TO MERGE
```

## Verdict states

- `SAFE_TO_MERGE`
- `COLLISION_CONFIRMED`
- `REPAIR_REQUIRES_REVIEW`
- `INDEPENDENT_CHANGE_FAILED`
- `TEXTUAL_CONFLICT`
- `INSUFFICIENT_EVIDENCE`

Avoid a binary safe verdict when evidence is incomplete.

---

# 19. Dashboard

Build the dashboard after the core workflow works.

The dashboard should read `passport.json`; it should not contain analysis logic.

## Screen 1: Change overview

Show:

```text
Base                         PASS
Coupon change                PASS
Payment retry change         PASS
Combined existing tests      PASS
```

## Screen 2: Intent map

Show:

- Original prompt A
- Original prompt B
- Requirements
- Shared entities
- Shared side effects

Simple visualization:

```text
Coupon change ----> Order.total <---- Payment retry
       |                                  |
       `----> Checkout finalization <-----'
```

## Screen 3: Investigation

Show:

- Hypothesis
- Requirement IDs
- Generated test
- Expected behavior
- Observed behavior
- Failure log excerpt

## Screen 4: Repair

Show:

- Root cause
- Files modified
- Small diff
- Explanation

## Screen 5: Passport

Show:

- Before/after metrics
- Test counts
- Stability results
- Final verdict

## Design rules

- Use a clear dark-on-light or accessible dark theme.
- Do not overload the screen with logs.
- Use red only for confirmed failure.
- Use green only for verified success.
- Display requirement IDs consistently.
- Make the before/after transition visually obvious.

---

# 20. Complete implementation roadmap

Adapt the timing to the remaining hackathon hours. Preserve the order.

## Phase 1: Golden scenario

**Status: complete.**

Deliverables:

- Base checkout application (`examples/checkout`) — built on `jointly-demo-base` (`57ffb46`)
- Coupon prompt and branch (`agent/coupon` at `2b8990f`) — 12 tests pass
- Payment-retry prompt and branch (`agent/payment-retry` at `2d12dbb`) — 8 tests pass
- Combined demonstration branch (`demo/combined-broken`) — 58/58 existing tests pass
- Validated semantic collision documented in `scenarios/checkout/expected-collision.md`
- Temporary manual collision probe used only to validate the fixture — failed for the predicted reason, deleted, never committed

Exit condition (met):

- Both branches pass independently.
- Git combines them cleanly with no textual conflict.
- All 58 existing combined tests pass (the collision is invisible to existing tests).
- A temporary manual probe confirmed: replay returns HTTP 400 because the payment-retry guard applies the legacy invariant `total = subtotal + tax`, which a discounted order (`total = subtotal − discountAmount + tax`) legitimately fails.
- The probe was deleted after validation; it was never committed.
- Jointly must later generate the persistent executable interaction test (Phase 5).

Do not proceed with Phase 2 until Phase 1 is confirmed reliable from a clean clone.

## Phase 2: Deterministic core

Deliverables:

- Configuration loader
- Run manifest
- Change validation
- Workspace manager
- Command runner
- Output capture
- Artifact directories

Exit condition:

```text
npm run jointly -- analyze
```

can prepare the workspaces and record the existing-test results.

## Phase 3: MCP server

Deliverables:

- Local STDIO server
- Essential MCP tools
- Input validation
- Bounded execution
- Structured responses

Exit condition:

- Every MCP tool works independently.
- Bob can discover and call the enabled tools.

## Phase 4: Bob mode and skills

Deliverables:

- Project custom mode
- Mode rules
- Five focused skills
- Subagent task definitions

Exit condition:

- Bob extracts both intent contracts.
- Bob produces at least one useful collision hypothesis.

## Phase 5: Generated interaction test

Deliverables:

- Test-generation workflow
- Test-quality validation
- Test execution through MCP
- Evidence classification

Exit condition:

- Bob creates a new test that fails on the combined implementation for the correct reason.

This is the most important milestone.

## Phase 6: Repair loop

Deliverables:

- Root-cause analysis
- Repair generated by Bob
- Repair patch export
- Full verification matrix

Exit condition:

- Original and generated tests pass.
- Both intent contracts remain satisfied.

## Phase 7: Stability verification

Deliverables:

- Repeated scenario runner
- Fixed seed
- Concurrency control
- Before/after counts

Exit condition:

- Demonstration produces reliable, repeatable metrics.

## Phase 8: Passport and dashboard

Deliverables:

- `passport.json`
- `passport.html`
- Lightweight dashboard

Exit condition:

- A judge can understand the problem, evidence, repair, and verdict in approximately 20 seconds.

## Phase 9: Reliability and submission

Deliverables:

- Clean-clone setup instructions
- Three successful rehearsals
- Backup completed run
- Backup demo video
- Bob session screenshots
- README and architecture documentation

Exit condition:

- The full demonstration works without external network dependencies.

---

# 21. Engineering backlog

## P0: Must have

- [ ] Base checkout API
- [ ] Coupon change and tests
- [ ] Payment-retry change and tests
- [ ] Hidden semantic collision
- [ ] `jointly.yaml` parser
- [ ] Git reference validation
- [ ] Isolated workspace creation
- [ ] Existing-test runner
- [ ] Run artifact storage
- [ ] Jointly MCP server
- [ ] `register_run`
- [ ] `prepare_workspaces`
- [ ] `read_change_diff`
- [ ] `run_existing_tests`
- [ ] `run_generated_test`
- [ ] Bob custom mode
- [ ] Intent extraction skill
- [ ] Interaction discovery skill
- [ ] Test-generation skill
- [ ] Repair skill
- [ ] Passport skill
- [ ] Bob-generated interaction test
- [ ] Confirmed failure evidence
- [ ] Bob-generated repair
- [ ] Complete verification
- [ ] `passport.json`
- [ ] `passport.html`
- [ ] Bob session screenshots
- [ ] README
- [ ] Demo script

## P1: Strong additions

- [ ] Stability matrix
- [ ] Interaction-map visualization
- [ ] Patch download
- [ ] Safe no-collision example
- [ ] Polished dashboard
- [ ] Run-history list
- [ ] Better log redaction

## P2: Only after the presentation is stable

- [ ] More than two changes
- [ ] GitHub pull-request integration
- [ ] More programming languages
- [ ] Hosted execution
- [ ] Organization analytics
- [ ] Historical collision patterns
- [ ] External ticket-system integration

---

# 22. Testing and quality plan

## Unit tests

Test:

- Configuration parsing
- Required-field validation
- Git reference resolution
- Common-base detection
- Workspace naming and isolation
- Command timeout handling
- Exit-code capture
- Output truncation
- Artifact path safety
- Schema validation
- Passport generation
- Secret-redaction helpers

## Integration tests

Test:

- Base workspace creation
- A workspace creation
- B workspace creation
- Combined workspace creation
- Existing test command
- Generated test command
- Patch export
- Stability runner

## End-to-end cases

### Known semantic collision

Expected:

- A passes
- B passes
- Existing A+B tests pass
- Generated test fails
- Repair succeeds
- Full verification passes

### Safe change pair

Expected:

- No collision is confirmed without executable evidence
- Verdict may be safe or insufficient evidence depending on coverage

### Textual conflict

Expected:

- Classified separately
- No claim of semantic discovery

### Independently broken branch

Expected:

- Semantic comparison stops
- Broken change is clearly identified

### Invalid generated test

Expected:

- Classified as `test-invalid`
- Not presented as collision evidence

### Timeout

Expected:

- Process is terminated safely
- Evidence states that execution timed out

## Demo reliability

- Pin dependencies.
- Avoid runtime network calls.
- Use fixed seeds.
- Use bounded timeouts.
- Prepare a completed run as a fallback display.
- Record a backup demo.
- Rehearse from a clean checkout three times.

---

# 23. Risks and mitigations

## Risk: Generated tests are inconsistent

Mitigation:

- Use structured intent contracts.
- Require observable outcomes.
- Generate one test at a time.
- Provide existing test examples.
- Validate compilation before classification.

## Risk: The demonstration appears hard-coded

Mitigation:

- Show the original prompts.
- Show that the interaction test is absent initially.
- Show Bob generating the test.
- Preserve the generated artifact and task session.
- If time permits, include one safe pair.

## Risk: The promise sounds impossible

Mitigation:

- State the narrow product promise.
- Present hypotheses and evidence separately.
- Never claim complete semantic correctness.

## Risk: Bob appears incidental

Mitigation:

- Bob extracts intent.
- Bob coordinates focused analysis.
- Bob generates the cross-change test.
- Bob diagnoses and repairs the collision.
- Bob verifies the result.
- Show Bob task history during the presentation.

## Risk: Live execution fails

Mitigation:

- Local MCP server
- No external API dependency
- Pinned packages
- Fixed test seed
- Saved completed run
- Backup video

## Risk: Repair overfits one test

Mitigation:

- Preserve all original tests.
- Run related negative cases.
- Run repeated and concurrent scenarios.
- Use independent repair verification.

## Risk: Scope becomes too large

Mitigation:

Protect this chain:

```text
Prompts
  -> intent contracts
  -> interaction hypothesis
  -> generated test
  -> reproducible failure
  -> Bob repair
  -> repeated verification
  -> Merge Safety Passport
```

Everything outside that chain is optional.

---

# 24. Security and safety

Jointly executes code and commands, so the prototype needs clear boundaries.

## Command execution

- Execute only configured commands.
- Do not pass raw prompt text into a shell.
- Use argument arrays where practical.
- Enforce timeouts.
- Terminate child processes on timeout.
- Limit output size.

## Filesystem

- Validate repository-relative paths.
- Reject traversal such as `../` outside the workspace.
- Keep runs in a dedicated directory.
- Do not modify the original branches.
- Exclude secrets and ignored files from reports.

## Evidence

- Redact tokens, passwords, and obvious credentials.
- Avoid uploading real client data.
- Use only synthetic demonstration data.
- Store only the evidence necessary for the run.

## Repair safety

- Apply repairs only to the isolated combined workspace.
- Export a patch for human review.
- Never automatically push or merge during the MVP.

---

# 25. Metrics and business value

## Technical metrics

- Requirements extracted
- Requirements satisfied before repair
- Requirements satisfied after repair
- Shared contracts discovered
- Hypotheses generated
- Missing tests created
- Confirmed violations reproduced
- Existing tests preserved
- Failures before repair
- Failures after repair
- Stability iterations passed

## Productivity metrics

- Time to reproduce collision
- Time to diagnose collision
- Time to produce verified repair
- Manual steps automated
- Number of files narrowed for human review
- Review artifacts generated

## Target users

- Teams using multiple AI coding agents
- Teams with high pull-request volume
- Platform engineering teams
- Developer-productivity teams
- Organizations that require auditable evidence for AI-generated code

## Business value

- Fewer escaped integration defects
- Less manual investigation
- Safer parallel AI development
- Faster review of agent-generated changes
- Better auditability
- Evidence-based merge decisions

## Positioning statement

> For engineering teams using parallel AI coding agents, Jointly is an intent-aware integration gate that discovers behavioral collisions between generated changes before merge. Unlike ordinary CI and textual conflict detection, Jointly understands the original tasks, creates missing cross-change tests, and produces verified repair evidence using IBM Bob.

---

# 26. Hackathon presentation plan

Target duration: approximately four minutes.

## 0:00-0:30 - Problem

Show two AI coding agents receiving separate prompts.

Say:

> AI agents can implement features in parallel, but they cannot anticipate every assumption made by another agent.

## 0:30-1:00 - Independent success

Show:

```text
Coupon branch:         PASS
Payment-retry branch:  PASS
Combined existing CI:  PASS
```

Say:

> Every signal says these changes are safe.

## 1:00-1:40 - Bob understands intent

Show:

- Original prompts
- Extracted requirements
- Shared `Order.total` and checkout-finalization concepts
- Collision hypothesis

Say:

> Jointly uses Bob to understand why the changes exist, not only which lines changed.

## 1:40-2:15 - The reveal

Show Bob generating the missing interaction test and running it.

The test fails.

Say:

> Both agents were correct in isolation. Neither one was correct about the system they created together.

## 2:15-2:55 - Repair

Show:

- Violated requirement IDs
- Root cause
- Small repair diff
- Generated regression test

## 2:55-3:30 - Stability proof

Show:

```text
Before repair: 23 failures / 50 runs
After repair:   0 failures / 50 runs
```

Use actual measured numbers in the final presentation.

## 3:30-4:00 - Passport and business value

Show the final passport.

Close with:

> Jointly turns parallel AI development from a trust exercise into an evidence-based merge decision.

## Presentation rules

- Lead with the failure, not the architecture.
- Do not spend presentation time explaining every MCP tool.
- Show Bob visibly performing the critical workflow.
- Keep logs short.
- Use one understandable business invariant.
- Make before and after evidence visible simultaneously.
- State limitations honestly.

---

# 27. Submission checklist

## Repository

- [ ] Project builds from documented instructions
- [ ] Dependencies are pinned
- [ ] `jointly.yaml` example is included
- [ ] Sample prompts are included
- [ ] Both demonstration changes are reproducible
- [ ] Custom mode is committed
- [ ] Skills are committed
- [ ] MCP configuration is documented
- [ ] MCP server source is included
- [ ] No secrets are committed
- [ ] License is included

## Bob evidence

- [ ] All important Bob tasks are represented
- [ ] Session-summary screenshots are readable
- [ ] Screenshots are under `bob_sessions/`
- [ ] File names are descriptive
- [ ] Bob's role is explained in the README

## Documentation

- [ ] Problem statement
- [ ] Product explanation
- [ ] Architecture diagram
- [ ] Setup steps
- [ ] Demo steps
- [ ] Example output
- [ ] Limitations
- [ ] Future roadmap
- [ ] Technology list
- [ ] Team information

## Demo

- [ ] Four-minute version rehearsed
- [ ] Shorter fallback version rehearsed
- [ ] Clean run completed three times
- [ ] Saved completed run available
- [ ] Backup video available
- [ ] Actual before/after metrics recorded

## Final integrity checks

- [ ] No exaggerated claims
- [ ] Generated test genuinely absent from the initial branches
- [ ] Collision is not merely a textual conflict
- [ ] Repair does not disable either feature
- [ ] Original tests still pass
- [ ] Final verdict is supported by evidence

---

# 28. Suggested Bob prompts

Use these as starting prompts. Adjust them to the actual repository.

## Architecture task

```text
We are building Jointly, an intent-aware integration gate for parallel
AI-generated changes. Review the project guide and create a minimal TypeScript
architecture with a deterministic core, a local STDIO MCP server, a sample
checkout application, and run artifacts. Keep the MVP limited to two changes
from a common base. Do not build the dashboard yet.
```

## Golden scenario task

```text
Create a small checkout application and two independent feature changes from
the supplied prompts. The coupon change and payment-retry change must pass
their local tests independently. Design a believable semantic interaction in
which retrying payment on a discounted order changes the total or duplicates
the discount. The branches must merge without a textual conflict, and the
existing combined tests should not initially cover the interaction.
```

## Intent extraction task

```text
Using the extract-intent-contract skill, analyze each supplied change prompt
independently. Produce observable requirements with stable IDs, entities,
side effects, expected outcomes, sources, and ambiguities. Save the contracts
to the current Jointly run directory. Do not inspect the known expected
collision document.
```

## Interaction investigation task

```text
Using both intent contracts and the two diffs, identify shared APIs, state,
entities, side effects, and temporal assumptions. Produce no more than three
ranked collision hypotheses. Every hypothesis must reference requirements
from both changes and contain a minimal executable scenario.
```

## Test-generation task

```text
Choose the highest-risk collision hypothesis. Follow the repository's Vitest
conventions and create the smallest deterministic interaction test that can
prove or reject it. The test must exercise behavior from both changes and
must identify the related requirement IDs. Do not modify production code.
Use the Jointly MCP tools to execute and classify the test.
```

## Repair task

```text
The generated interaction test has confirmed a collision. Explain the
conflicting assumptions and violated requirements, then implement the
smallest root-cause repair in the isolated combined workspace. Do not weaken
or remove tests. Run all existing and generated tests and export the repair
as a patch.
```

## Verification task

```text
Independently review the repair against both intent contracts. Run the full
test matrix and the configured stability scenarios. Reject the repair if it
breaks an original requirement, weakens a test, or only handles one hard-coded
input. Save structured evidence for the Merge Safety Passport.
```

## Submission review task

```text
Review the Jointly repository for hackathon readiness. Verify setup
instructions, Bob custom mode, skills, MCP configuration, demonstration
scenario, run artifacts, limitations, and bob_sessions evidence. Report only
specific remaining blockers and do not add new product scope.
```

---

# 29. Future roadmap

Only discuss these after the MVP works.

## More than two changes

Build an interaction graph and prioritize combinations instead of testing every possible subset.

## Pull-request integration

Import prompts and patches from pull requests and publish the passport as a check or review artifact.

## Contract-aware analyzers

Add specialized analyzers for:

- OpenAPI
- GraphQL
- Database migrations
- Events and schemas
- Infrastructure configuration

## Language support

Add test adapters for Python, Java, Go, and other ecosystems.

## Historical intelligence

Learn which modules, contracts, and change combinations frequently produce collisions.

## Enterprise policies

Allow teams to define mandatory invariants such as:

- Idempotency
- Authorization
- Data residency
- Backward compatibility
- Audit logging

## Human approval workflow

Route the passport and repair patch to a designated reviewer before any merge action.

---

# 30. Definition of done

The Jointly MVP is complete only when all of the following are true:

- [ ] Two changes originate from separate natural-language tasks.
- [ ] Both changes share a known base revision.
- [ ] Both changes pass independently.
- [ ] Git combines them without a textual conflict.
- [ ] Existing combined tests do not expose the main problem.
- [ ] Bob extracts structured requirements from both prompts.
- [ ] Bob maps requirements to code and shared business surfaces.
- [ ] Bob generates a test that exercises both changes.
- [ ] The test fails on the combined implementation for the expected reason.
- [ ] The failure maps to requirements from both changes.
- [ ] Bob explains the conflicting assumptions.
- [ ] Bob implements a root-cause repair in an isolated workspace.
- [ ] Original tests pass after repair.
- [ ] Generated interaction tests pass after repair.
- [ ] Stability verification succeeds.
- [ ] A repair patch is exported.
- [ ] A Merge Safety Passport is generated.
- [ ] The complete flow works from a clean checkout.
- [ ] Relevant Bob task-session summaries are stored in `bob_sessions/`.
- [ ] The demonstration has been rehearsed at least three times.

---

# 31. Immediate next steps

Start in this exact order:

1. Create the repository in IBM Bob IDE.
2. Commit this guide to the repository.
3. Create the base checkout application.
4. Write the coupon and payment-retry prompts before implementing their branches.
5. Create the two branches and make each pass independently.
6. Introduce a believable semantic collision without creating a textual conflict.
7. Confirm the existing combined test suite misses the problem.
8. Write the cross-feature test manually once to validate the scenario.
9. Remove that test from the initial branches after validation.
10. Build the deterministic workspace and test-running core.
11. Build and connect the local Jointly MCP server.
12. Add the Bob custom mode and focused skills.
13. Ask Bob to extract intent and generate the equivalent interaction test.
14. Make Bob reproduce, repair, and verify the collision.
15. Generate the passport.
16. Build the dashboard only after the entire workflow is reliable.
17. Capture Bob task-session summaries throughout development.
18. Rehearse and finalize the submission.

## Critical milestone

> Bob reads two prompts and produces a new test that fails only when their generated changes are combined.

Once that works reliably, Jointly has a credible technical core, a memorable demonstration, and a strong reason for IBM Bob to be central.

---

# 32. Official references

- IBM Bob 2.0 Hackathon Guide: <https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html>
- IBM Bob Custom Modes: <https://bob.ibm.com/docs/ide/configuration/custom-modes>
- IBM Bob Skills: <https://bob.ibm.com/docs/ide/features/skills>
- Using MCP in IBM Bob: <https://bob.ibm.com/docs/ide/configuration/mcp/mcp-in-bob>
- IBM Bob 2.0 Hackathon page: <https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon>

---

## Final recommendation

Protect the smallest complete loop before adding integrations:

```text
Prompts
  -> intent contracts
  -> shared interaction surface
  -> collision hypothesis
  -> generated interaction test
  -> reproducible failure
  -> IBM Bob repair
  -> repeated verification
  -> Jointly Merge Safety Passport
```

If time becomes limited, cut the dashboard, GitHub integration, additional scenarios, and advanced visualizations. Do not cut the generated interaction test, verified repair, Bob evidence, or passport.
