# Payment Retry Feature Task

Add idempotent payment processing.

## Requirements

- Payment requests accept an idempotency key.
- Repeating a request with the same key returns the original payment result.
- A duplicate request must not create another payment.
- A retry must not modify a finalized order.
- Different idempotency keys represent different payment attempts.
- Existing checkout behavior must remain compatible.
- Add focused automated tests for payment retries.

## Scope restrictions

- Do not add coupons.
- Do not inspect or depend on the coupon change.
- Do not add cross-feature interaction tests.
