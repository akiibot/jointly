# Interaction-test quality checklist

Before running a generated test, confirm:

- The test is valid Vitest and follows the checkout fixture's import and setup conventions.
- The title names the hypothesis or stable requirement IDs.
- The scenario exercises both changes, not two unrelated isolated behaviors.
- The test uses the smallest setup needed and deterministic values.
- Expected behavior follows from the intent contracts and is expressed with named constants.
- The assertion observes public behavior or a contract-relevant persisted effect.
- The test would pass if both requirements were compatible and fail only on their interaction.
- No production file, existing test, package file, or feature branch was edited.
- A compile/setup failure cannot be mistaken for a collision.
- The file is saved beneath `runs/<run-id>/generated-tests/` and can be rerun unchanged after repair.

