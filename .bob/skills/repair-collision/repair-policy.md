# Collision repair policy

## Preconditions

- Evidence classification is `confirmed-collision`.
- The generated test is executable and fails on product behavior rather than setup.
- Both intent contracts and implicated requirement IDs are available.

## Allowed changes

- Edit only the isolated combined workspace for this run.
- Change the minimum production surface needed to reconcile both contracts.
- Add narrowly scoped explanatory code or types when they clarify the compatibility rule.

## Forbidden changes

- Editing the base, change-a, change-b, or original feature branches
- Weakening, skipping, deleting, or rewriting assertions to get green results
- Disabling validation, retries, integrity checks, or either feature
- Broad refactors unrelated to the root cause
- Committing, merging, pushing, or applying the repair outside the isolated workspace

## Required verification

- The unchanged generated interaction test passes after repair.
- The full existing suite passes after repair.
- Stability verification completes with zero failed iterations before a safe recommendation.
- The exported patch contains only the intended repair.
- The report explains how every implicated requirement remains satisfied.

