---
name: generate-interaction-tests
description: Turn one ranked Jointly collision hypothesis into a minimal executable Vitest interaction test and classify its result.
---

# Generate and validate an interaction test

Use this skill for one saved hypothesis at a time.

## Inputs

- `runId`
- one hypothesis ID
- its requirement IDs and expected observable behavior

## Workflow

1. Read the selected hypothesis, both intent contracts, relevant existing tests, and `test-quality-checklist.md`.
2. Design the shortest deterministic scenario that exercises behavior from both changes through public interfaces.
3. Write a new Vitest file beneath `runs/<run-id>/generated-tests/`. Include the hypothesis and requirement IDs in the test name or nearby metadata.
4. Do not edit application code, existing tests, package configuration, or source branches.
5. Call `run_generated_test` with the run ID, test path, hypothesis ID, requirement IDs, and explicit expected behavior.
6. Interpret only an assertion-level product-behavior failure in the generated test as `confirmed-collision`. Treat compile, import, fixture, setup, timeout, zero/all-skipped, unrelated-test, and environment failures according to the tool's structured classification.
7. If the result is `test-invalid`, repair the generated test and retry. Do not modify production code to make the test execute.
8. Preserve a valid failing reproduction for later repair verification and report the evidence artifact path.
