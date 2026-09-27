---
name: repair-collision
description: Diagnose a confirmed semantic collision, repair only the isolated combined workspace, and export a verified reviewable patch.
---

# Repair a confirmed collision

Use this skill only when `run_generated_test` produced `confirmed-collision` evidence.

## Inputs

- `runId`
- confirmed hypothesis and evidence artifact
- both intent contracts
- unchanged generated test path

## Workflow

1. Read both contracts, the hypothesis, failure evidence, and `repair-policy.md`. Restate the root cause and requirements that the repair must preserve. Persist the separate requirement-linked runtime interpretation as `runtime-diagnosis.json`; the test runner's execution classification alone is not the semantic diagnosis.
2. Locate the isolated combined workspace from the run artifacts. Never switch, edit, commit, or advance the original base or feature branches.
3. Implement the smallest compatibility fix in the combined workspace. Do not weaken or alter the generated reproduction or existing assertions.
4. If explicit requirements conflict, record the proposed decision and wait for operator authority or cite an already supplied precedence rule. An unresolved decision cannot be repaired into a safe verdict.
5. Call `export_resolution_patch` to freeze the candidate and metadata before verification.
6. Call `run_existing_tests` for every required post-repair workspace and then `run_generated_test` with the same generated test source and expectations.
7. If a check fails, diagnose rather than hiding the failure. If code changes, export the new candidate and rerun all invalidated verification.
8. Once all checks pass, call `run_stability_matrix` using the configured iterations, concurrency, and seed.
9. Review the repair with fresh verification context and persist `repair-review.json`: schema version `1`; `approve` or `revise`; exact repair and generated-test digests; the verification-context digest over collision evidence, test results, stability, decisions, and repair metadata; reviewed files; preservation concerns; and a concise summary. An older review becomes stale when any bound input changes.
10. Report the root cause, modified files, preserved and intentionally revised requirement IDs, authority source, before/after evidence, stability result, review artifact, and patch path. Do not merge automatically.
