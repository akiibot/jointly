# Expected Collision: Coupon + Idempotent Payment Replay

## Scenario

- Change A adds percentage coupons applied before tax.
- Change B adds idempotent payment retries.
- Both branches originate from `jointly-demo-base` (`57ffb46`).
- Both branches work correctly in isolation.
- They merge without textual conflicts.
- All 58 existing combined tests pass.

## Reproduction workflow

1. Create an order.
2. Add 4 items at 1000 cents each.
3. Apply `SAVE10`.
4. Finalize checkout.
5. Make the first payment using an idempotency key.
6. Replay payment using the same order and key.

## Verified financial values

- `subtotal`: 4000
- `discountAmount`: 400
- `tax`: 360
- `total`: 3960
- correct coupon-aware invariant:
  `total = subtotal - discountAmount + tax`
- payment replay's incompatible assumption:
  `total = subtotal + tax`

## Observed collision

- First keyed payment succeeds for 3960.
- Replay with the same key returns HTTP 400.
- The error reports a failed financial integrity check.
- The expected behavior is to return the original successful payment.
- No duplicate payment is created and the order is not modified, but the
  same-key retry contract is still violated because the original result is
  not returned.

## Root cause

The payment-retry change encodes a pre-coupon financial invariant. The coupon
change legitimately introduces `discountAmount` into the order-total contract.
Each branch is locally correct against the base, but their assumptions are
incompatible when combined.

## Why ordinary checks miss it

- no textual merge conflict
- both feature branches pass independently
- all existing tests pass after merging
- coupon tests do not exercise keyed payment replay
- payment-retry tests do not exercise discounted orders

## Expected safe behavior

A same-key retry for a finalized discounted order must return the original
payment unchanged, without creating another payment or modifying the finalized
order.

## Requirement decision required

The original `PAYMENT-6` base-only formula (`total = subtotal + tax`) and the
coupon-aware `COUPON-4` behavior cannot both describe a discounted order
unchanged. `proposed-requirement-resolution.json` preserves both original
statements and proposes the combined formula
`total = subtotal - discountAmount + tax`, but it is intentionally marked
`unresolved`. An authorized operator must accept it, or cite an already
supplied precedence rule, before Jointly may certify the pair as safe.

`PAYMENT-3` idempotent replay, duplicate-payment prevention, and finalized
order no-mutation remain preserved requirements; the proposal does not relax
them.

## Manual validation note

A temporary `manual-collision-probe.test.ts` was used only to validate the
fixture. It failed for the predicted reason, was then deleted, and was never
committed. The original six test files still pass 58/58. Jointly must later
generate its own executable interaction test from the two change intents.

## Evidence

Reference:

- `bob_sessions/protos_task06_combined_validation_results.png`
- `bob_sessions/protos_task06_collision_probe_results.png`
- `bob_sessions/protos_task06_combined_validation_summary.png`
