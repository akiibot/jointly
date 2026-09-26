---
name: generate-merge-passport
description: Generate an evidence-backed Jointly Merge Safety Passport and concise human-readable summary from completed run artifacts.
---

# Generate the Merge Safety Passport

Use this skill after investigation and all applicable repair verification are complete.

## Inputs

- `runId`
- the completed run artifact directory

## Workflow

1. Inventory the manifest, both intent contracts, diffs, existing-suite results, hypotheses, generated-test evidence, repair patch, repaired-suite results, and stability results.
2. Call `collect_evidence` for the run. Resolve missing or contradictory artifacts before making a verdict claim.
3. Apply the evidence gates in `passport-template.md`. Use `INSUFFICIENT_EVIDENCE` whenever a required gate lacks proof.
4. Call `generate_passport`. Treat its generated `passport.json` as the machine-readable source of truth.
5. Present a concise summary using `passport-template.md`, citing run-relative artifact paths for every material claim.
6. Never upgrade the verdict beyond the evidence. A clean textual merge or passing legacy suite alone is not merge safety.

Do not edit product code or manually rewrite `passport.json` after generation.

