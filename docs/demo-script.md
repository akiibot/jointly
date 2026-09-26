# Jointly live demo script

Target duration: **5–7 minutes**. Use the completed backup run if any live step becomes unreliable.

## Before going live

1. Check out `main` with a clean working tree.
2. Run `npm install`, `npm run build`, and `npm test` while network access is available.
3. Set the local absolute `cwd` in `.bob/mcp.json`; do not commit it.
4. Verify `jointly-demo-base`, `agent/coupon`, and `agent/payment-retry` resolve to the expected frozen commits.
5. Open IBM Bob in **Jointly – AI Merge Investigator** mode.
6. Keep the dashboard and the backup passport ready in separate tabs.

## Opening statement

> Two AI agents independently changed the same checkout system. Both branches pass their own tests, and their code merges without a textual conflict. Jointly asks the harder question: do their intentions still work together?

## 1. Register the run

Ask Bob to use `register_run` with:

- base: `jointly-demo-base`
- change A: `agent/coupon`, prompt `scenarios/checkout/coupon-prompt.md`
- change B: `agent/payment-retry`, prompt `scenarios/checkout/payment-retry-prompt.md`

Expected output: a new run ID, resolved base `57ffb46`, coupon `2b8990f`, and payment retry `2d12dbb`.

Say: **“The refs are now frozen. Nothing later can silently move the evidence.”**

## 2. Prepare four workspaces

Ask Bob to use `prepare_workspaces` for the run.

Expected output:

- `base`
- `change-a`
- `change-b`
- `combined`
- textual conflict: `null`

Say: **“The source branches remain untouched; the investigation happens in isolated copies.”**

## 3. Run existing tests

Ask Bob to run `run_existing_tests` for all four workspaces.

Expected output:

| Workspace | Expected tests | Result |
|---|---:|---|
| Base | 38 | Pass |
| Coupon | 50 | Pass |
| Payment retry | 46 | Pass |
| Combined | 58 | Pass |

Say: **“Everything is green—including the merged code—but that only proves the tests do not cover the interaction.”**

## 4. Extract both intent contracts

Ask Bob to apply `extract-intent-contract` to both supplied prompts and persist the normalized contracts under `runs/<run-id>/intents/`.

Expected highlights:

- `COUPON-1`: valid coupon reduces pretax subtotal.
- `COUPON-4`: discount is applied before tax.
- `PAYMENT-3`: the same idempotency key returns the original payment.
- `PAYMENT-6`: replay checks finalized-order financial integrity.

Say: **“Jointly compares observable intent, not only overlapping lines.”**

## 5. Discover and rank the interaction

Ask Bob to apply `discover-interactions` using both intents and the bounded change diffs.

Expected top hypothesis: `H-001`, high risk. Both changes affect the accounting meaning of `Order.total` during checkout finalization and payment replay.

Expected formula mismatch:

```text
coupon:        total = (subtotal - discountAmount) + tax
payment replay expects: total = subtotal + tax
```

## 6. Generate and run the interaction test

Ask Bob to apply `generate-interaction-tests`, save the test under `generated-tests/`, and run it with `run_generated_test` using label `before-repair`.

Expected output:

- classification: `confirmed-collision`
- HTTP expected: `201`
- HTTP observed: `400`
- example: `3960 !== 4000 + 360`

Say: **“This is a valid assertion failure linked to both contracts—not a compilation or setup error.”**

## 7. Repair only the combined workspace

Ask Bob to apply `repair-collision` with the requirement contracts and confirmed evidence. Then use `export_resolution_patch`.

Expected repair: make the replay integrity identity coupon-aware by including `discountAmount`. The feature refs remain unchanged.

Say: **“The repair is isolated, minimal, and reviewable as a patch.”**

## 8. Verify after repair

Ask Bob to rerun:

1. the generated interaction test with label `after-repair`;
2. all existing tests;
3. `run_stability_matrix` with 50 iterations, concurrency 4, and seed 20260926.

Expected output:

- after-repair classification: `hypothesis-rejected`, exit 0;
- all existing tests pass;
- stability: `50/50`, zero failures.

## 9. Generate the passport

Ask Bob to run `collect_evidence` with the relevant requirement IDs, then `generate_passport` with verdict `SAFE_TO_MERGE`.

Expected output:

- `missingRequired: []`
- `passport.json`
- `passport.html`
- verdict: `SAFE_TO_MERGE`

Say: **“Jointly refuses this verdict unless every evidence gate is complete.”**

## 10. Show the dashboard

Run:

```bash
npm run dev --workspace=@jointly/dashboard
```

Load the completed `passport.json`. Move quickly through:

1. four passing existing-test workspaces;
2. the two intent contracts converging on `Order.total`;
3. the confirmed interaction failure;
4. the before/after repair transition;
5. `50/50` stability and `SAFE TO MERGE`.

## Closing statement

> Jointly catches the gap between “the code merged” and “the intentions still work together.” IBM Bob supplies the reasoning; Jointly supplies isolation, executable evidence, repeatability, and a verdict judges can audit.

## Failure fallback

- If Bob or the live terminal stalls, stop the run rather than improvising commands.
- Open the preserved backup `passport.html` and dashboard.
- Use the progressive screenshots in `bob_sessions/` to show Bob performing each reasoning stage.
- Never claim a live step succeeded without its persisted artifact.
