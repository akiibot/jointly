# Investigation rules

1. Analyze each supplied prompt independently before comparing changes or reading the other change's prompt.
2. Record explicit prompt statements as facts. Record inferred constraints under `assumptions`; never present an inference as a fact.
3. Assign stable requirement IDs using an uppercase change-specific prefix and a positive sequence number, such as `COUPON-1` or `PAYMENT-3`. Never renumber an ID during the same run.
4. After intent contracts are saved, inspect each change through Jointly's `read_change_diff` MCP tool. Do not infer behavior from filenames alone.
5. Look first for interaction surfaces involving shared state, side effects, API or data contracts, invariants, error behavior, and temporal or retry behavior.
6. Rank hypotheses by likelihood and impact. For the MVP, keep at most the top two hypotheses.
7. Every hypothesis must name both change IDs, the implicated requirement IDs, the shared surfaces, a concrete scenario, and the evidence supporting the hypothesis.
8. A hypothesis is not a collision. Only a valid failing executable interaction test can confirm a collision.
9. Never modify the base, change-a, or change-b workspace. Investigation is read-only outside generated artifacts under `runs/<run-id>/`.
10. Preserve original prompt text and extracted contracts. ID normalization must be recorded as an explicit old-to-new mapping and must never change a statement's meaning.
11. If explicit requirements conflict, write `requirement-resolutions.json` with the conflicting IDs, verbatim original statements, proposed replacement, rationale, affected generated test, and authority. Do not relabel an explicit requirement as an assumption.
12. A proposed decision without operator authority or a cited pre-existing precedence rule remains `unresolved` and blocks `SAFE_TO_MERGE`.
