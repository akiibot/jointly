# Checkout validation oracle

These files validate the known repaired checkout interaction in CI. They are not runtime investigation input and must not be supplied to either reasoning provider as hints.

The regression harness clones the frozen `origin/demo/combined-broken` commit into a temporary repository, applies `coupon-aware-replay.patch` only there, copies the interaction matrix into that isolated checkout, and runs the real Vitest suite. It also verifies that the configured base, feature, and combined refs did not move.

The matrix includes seven fixed contract cases plus a reproducibility check and nine scheduled executions. The schedule consumes `JOINTLY_SEED`, always covers zero/one-cent, tax-rounding, valid/invalid coupon, sequential, different-key, and concurrent boundaries, then derives additional inputs from the seed. These remain one scenario family and must not be described as independently discovered collisions or as evidence that a live model generated the test.
