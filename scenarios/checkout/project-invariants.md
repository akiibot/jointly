# Shared Checkout Invariants

- Monetary values are stored as integer cents.
- Discounts are applied before tax.
- A finalized order must not change during payment processing.
- Repeating the same logical payment operation must not duplicate side
  effects.
- Existing checkout tests must continue to pass.
- Original feature branches must never be modified during Jointly analysis.
