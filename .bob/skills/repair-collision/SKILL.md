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

1. Read both contracts, the hypothesis, failure evidence, and `repair-policy.md`. Restate the root cause and requirements that the repair must preserve.
2. Locate the isolated combined workspace from the run artifacts. Never switch, edit, commit, or advance the original base or feature branches.
3. Implement the smallest compatibility fix in the combined workspace. Do not weaken or alter the generated reproduction or existing assertions.
4. Call `run_existing_tests` for the repaired workspace and then `run_generated_test` with the same test and expectations.
5. If either check fails, diagnose rather than hiding the failure. Iterate only within the combined workspace.
6. Once both pass, call `run_stability_matrix` using the configured iterations, concurrency, and seed.
7. Call `export_resolution_patch` and save the reviewable patch artifact.
8. Report the root cause, modified files, preserved requirement IDs, before/after evidence, stability result, and patch path. Do not merge automatically.

