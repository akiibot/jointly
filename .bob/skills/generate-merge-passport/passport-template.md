# Merge Safety Passport summary template

## Verdict

- **Run:** `<run-id>`
- **Verdict:** `<SAFE_TO_MERGE | COLLISION_CONFIRMED | REPAIR_REQUIRES_REVIEW | INDEPENDENT_CHANGE_FAILED | TEXTUAL_CONFLICT | INSUFFICIENT_EVIDENCE>`
- **Evidence completeness:** `<complete | incomplete, with missing items>`

## Changes and intent

| Change | Commit | Intent artifact | Requirement IDs |
| --- | --- | --- | --- |
| `<change-a>` | `<sha>` | `<path>` | `<ids>` |
| `<change-b>` | `<sha>` | `<path>` | `<ids>` |

## Verification

| Gate | Result | Evidence |
| --- | --- | --- |
| Base existing suite | `<pass/fail/missing>` | `<artifact>` |
| Change A existing suite | `<pass/fail/missing>` | `<artifact>` |
| Change B existing suite | `<pass/fail/missing>` | `<artifact>` |
| Combined existing suite | `<pass/fail/missing>` | `<artifact>` |
| Interaction test before repair | `<classification>` | `<artifact>` |
| Interaction test after repair | `<pass/fail/not applicable>` | `<artifact>` |
| Repaired existing suite | `<pass/fail/not applicable>` | `<artifact>` |
| Stability matrix | `<passed>/<iterations>` | `<artifact>` |

## Collision and repair

- **Hypothesis:** `<id and explanation>`
- **Requirements:** `<stable IDs>`
- **Expected:** `<observable expectation>`
- **Observed:** `<observable result>`
- **Root cause:** `<concise diagnosis>`
- **Repair patch:** `<artifact path or not applicable>`

## Evidence gates

- `SAFE_TO_MERGE` requires passing independent and combined baseline suites, a valid interaction test, passing repaired verification when a collision existed, zero failed stability iterations, and complete cited artifacts.
- `COLLISION_CONFIRMED` requires a valid failing executable interaction test.
- `REPAIR_REQUIRES_REVIEW` is appropriate when a verified repair patch exists but still requires human review or lacks a safety gate.
- Use `INDEPENDENT_CHANGE_FAILED`, `TEXTUAL_CONFLICT`, or `INSUFFICIENT_EVIDENCE` when those conditions prevent a stronger conclusion.

## Reviewer action

`<Approve the exported patch for review, investigate missing evidence, or reject the merge.>`

