# Collision discovery checklist

For each potential interaction, cite both change IDs and requirement IDs.

## Shared surfaces

- Same model, field, repository, database row, cache key, API, route, event, file, symbol, or domain concept
- One change reads state or output written by the other
- Same error mapping, status code, serialization shape, or compatibility contract

## State and invariants

- Competing calculations or definitions of the same derived value
- Stale totals, flags, versions, or snapshots after the other change mutates state
- Validation or integrity checks that assume the pre-change state model
- Order-dependent state transitions

## Side effects

- Duplicate, missing, or reordered writes
- Payments, messages, retries, notifications, logging, or audit effects
- Idempotency behavior affected by state introduced by the other change
- Rollback or partial-failure behavior

## Temporal behavior

- First call versus retry or replay
- Before/after ordering, race windows, concurrency, and eventual consistency
- Cached or persisted results reused after another mutation

## Testability and ranking

- Can a short public-interface scenario execute both changes?
- Is the expected outcome grounded in explicit requirements rather than preference?
- Would existing single-change tests plausibly miss it?
- Rank higher when impact is severe, likelihood is credible, and reproduction is deterministic.
- Keep no more than two distinct hypotheses for the MVP.

