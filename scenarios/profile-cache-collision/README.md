# Profile update/cache hidden collision

This known-answer validation fixture models two cleanly merging changes from one common Git base:

- Change A makes profile display names mutable.
- Change B caches reads under the base system's prior immutability assumption.

Each change's existing tests pass independently, and their combined existing tests also pass. The interaction test first primes the cache, updates the same profile, and observes the stale cached name. The validation harness requires that test to fail before repair, applies a revision-aware cache repair, and then requires the unchanged interaction test and all existing tests to pass.

The prompts, expected failure, and repair are validation oracles. They must not be included in runtime reasoning context or described as model-generated evidence.
