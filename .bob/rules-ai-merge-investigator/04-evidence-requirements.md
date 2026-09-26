# Evidence requirements

1. Use Jointly MCP tools for repository operations and command execution so evidence is captured deterministically.
2. For every executed command, retain its command text, workspace, exit code, duration, timeout state, and bounded stdout/stderr artifact paths.
3. Link every hypothesis, test result, diagnosis, and repair claim to stable requirement IDs.
4. Never claim `confirmed-collision` without a valid failing executable interaction test. Never claim `SAFE_TO_MERGE` without the required passing verification artifacts.
5. Save generated tests and both before-repair and after-repair results under the run directory.
6. Distinguish `confirmed-collision`, `hypothesis-rejected`, `test-invalid`, and `environment-failure` exactly; do not collapse them into pass/fail.
7. Record both successful and failed evidence. Do not omit contradictory output.
8. The passport must cite artifact paths for its claims and must use `INSUFFICIENT_EVIDENCE` when required proof is missing.
9. Redact secrets and keep captured output bounded. Never include credentials, tokens, or environment secrets in evidence.

