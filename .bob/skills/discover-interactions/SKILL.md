---
name: discover-interactions
description: Compare two saved intent contracts and their diffs to rank concrete cross-change collision hypotheses.
---

# Discover cross-change interactions

Use this skill only after both independent intent contracts exist.

## Inputs

- `runId`
- the two intent-contract artifact paths

## Workflow

1. Load both intent contracts. Confirm stable, unique requirement IDs and note unresolved ambiguities.
2. Call Jointly's `read_change_diff` once for each change. Use returned artifacts and bounded content; do not operate on source branches directly.
3. Work through every section in `collision-checklist.md`.
4. Create candidate `CollisionHypothesis` objects with: stable `id`, both `changeIds`, implicated `requirementIds`, `sharedSurface`, evidence-based `explanation`, `risk`, and an ordered executable `scenario`.
5. Rank by likelihood and impact, deduplicate overlapping candidates, and retain at most the top two.
6. Save a JSON array to `runs/<run-id>/hypotheses.json`.
7. Report the ranking and the next hypothesis to test. Call each item a hypothesis, never a confirmed collision.

Do not edit production code or generate tests while using this skill.

