---
name: extract-intent-contract
description: Extract a structured, observable intent contract from one change prompt before comparing code or another change.
---

# Extract an intent contract

Use this skill once for each change in a registered Jointly run.

## Inputs

- `runId`
- one change ID from the run manifest
- that change's prompt path

## Workflow

1. Read the run manifest, the selected prompt, and only the shared project invariants needed to interpret it. Do not read the other prompt or either change diff yet.
2. Separate explicit statements from assumptions. Convert each observable obligation into one requirement.
3. Assign stable IDs with an uppercase change-specific prefix and positive sequence, such as `COUPON-1`. Never renumber IDs later in the run.
4. Describe each requirement's type, entities, side effects, observable outcome, exact source location and short excerpt. Put uncertainties in `assumptions` or contract-level `ambiguities`.
5. Validate the result against `intent-schema.json` in this skill directory.
6. Save only valid JSON to `runs/<run-id>/intents/<change-id>.json`.
7. Report the saved path, requirement IDs, and unresolved ambiguities. Do not speculate about cross-change collisions.

The output must match `IntentContract` exactly. Do not add facts learned from the implementation to a prompt-derived contract.

