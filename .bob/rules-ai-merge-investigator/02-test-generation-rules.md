# Interaction-test generation rules

1. Follow the Vitest conventions already used in `examples/checkout/tests/`.
2. Generate the smallest test that exercises behavior introduced by both changes through public interfaces whenever possible.
3. State expected behavior explicitly with well-named constants and link the test to its hypothesis and requirement IDs.
4. Test the interaction, not merely each feature in isolation. Avoid unrelated setup and broad snapshots.
5. During reproduction, write only beneath `runs/<run-id>/generated-tests/`. Do not modify production code, existing tests, configuration, or original feature branches.
6. Validate the test with Jointly's `run_generated_test` tool. Compile, import, fixture, and setup failures are `test-invalid`; timeouts and infrastructure failures are `environment-failure`; zero/all-skipped tests are `insufficient-evidence`. None is `confirmed-collision`.
7. Revise an invalid test until it executes meaningfully or report insufficient evidence. Never reinterpret infrastructure failure as product behavior.
8. Preserve the failing reproduction unchanged once it validly confirms a collision; use the same test to verify the repair.
