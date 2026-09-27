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

## Requirement decisions

- List every conflicting requirement ID and its unchanged original statement.
- State which requirements remain preserved and which contract was intentionally revised.
- Cite the operator decision or pre-existing precedence-rule source. If authority is missing, report `awaiting resolution` and do not use `SAFE_TO_MERGE`.
- Include the proposed replacement, rationale, affected unchanged generated test, and decision-artifact path.

## Evidence gates

- `SAFE_TO_MERGE` requires passing independent and combined baseline suites, a valid interaction test, passing repaired verification when a collision existed, zero failed stability iterations, and complete cited artifacts.
- `COLLISION_CONFIRMED` requires a valid failing executable interaction test.
- `REPAIR_REQUIRES_REVIEW` is appropriate when a verified repair patch exists but still requires human review or lacks a safety gate.
- Use `INDEPENDENT_CHANGE_FAILED`, `TEXTUAL_CONFLICT`, or `INSUFFICIENT_EVIDENCE` when those conditions prevent a stronger conclusion.

## Reviewer action

`<Approve the exported patch for review, investigate missing evidence, or reject the merge.>`
