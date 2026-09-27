# Repair rules

1. Repair only a `confirmed-collision` backed by a valid executable test.
2. Read both intent contracts, the ranked hypothesis, and the failing evidence before editing code.
3. Preserve every applicable requirement from both intent contracts. If two explicit requirements are materially inconsistent, stop for an authorized recorded resolution; do not silently weaken, reinterpret, or relabel either one.
4. Never weaken, skip, delete, or special-case tests to manufacture a green result.
5. Apply the smallest root-cause fix only in the isolated combined workspace returned by `prepare_workspaces`. Never edit or advance the source feature branches.
6. Explain the root cause, the compatibility rule introduced by the repair, and why the change is minimal.
7. Export the candidate patch metadata before verification so every execution fingerprint binds to that exact candidate. If code changes afterward, export again and rerun every invalidated check.
8. Verify the exact candidate with the unchanged generated interaction test and the complete existing suite in all required workspaces. Run stability verification before recommending merge safety.
9. The patch is the repair deliverable; do not merge it automatically.
