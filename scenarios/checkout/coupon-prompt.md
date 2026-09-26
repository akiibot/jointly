# Coupon Feature Task

Add percentage-based coupons to checkout.

## Requirements

- A valid percentage coupon reduces the pretax subtotal.
- Discounts must be applied before tax.
- A coupon can affect an order at most once.
- An invalid coupon must not modify the order.
- Existing checkout behavior must remain compatible.
- Add focused automated tests for the coupon feature.

## Scope restrictions

- Do not add payment idempotency.
- Do not add payment retries.
- Do not inspect or depend on the payment-retry change.
- Do not add cross-feature interaction tests.
