# Repair rules

1. Repair only a `confirmed-collision` backed by a valid executable test.
2. Read both intent contracts, the ranked hypothesis, and the failing evidence before editing code.
3. Preserve every applicable requirement from both intent contracts. Do not remove behavior from either change to eliminate the interaction.
4. Never weaken, skip, delete, or special-case tests to manufacture a green result.
5. Apply the smallest root-cause fix only in the isolated combined workspace returned by `prepare_workspaces`. Never edit or advance the source feature branches.
6. Explain the root cause, the compatibility rule introduced by the repair, and why the change is minimal.
7. Verify the repair with the unchanged generated interaction test and the complete existing suite. Run stability verification before recommending merge safety.
8. Use `export_resolution_patch` to produce a reviewable patch. The patch is the repair deliverable; do not merge it automatically.

