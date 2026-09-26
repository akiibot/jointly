# Submission rehearsal checklist

Complete this sheet three times from a fresh clone or clean disposable directory. Record the date, operator, run ID, duration, and result for each rehearsal.

## Repository-side verification

On 2026-09-27, commit `330c1c2` was cloned into a disposable directory. A locked `npm ci` installation, full build, and all 71 tests completed successfully with a clean working tree. This verifies clean-clone setup and deterministic code health; it does **not** count as one of the three required Bob-assisted end-to-end rehearsals.

Dependency installation requires registry access unless every tarball is already cached. Once `npm ci` has completed, build, tests, MCP execution, artifact generation, and dashboard presentation use local dependencies and require no external service.

## Preflight

- [ ] Clone `https://github.com/akiibot/jointly.git` into a new directory.
- [ ] Confirm Node.js 18+ and Git are installed.
- [ ] Run `npm install` while dependencies are available.
- [ ] Run `npm run build` successfully.
- [ ] Run `npm test`; expect 71 tests across 21 files.
- [ ] Update `.bob/mcp.json` with this clone's absolute path; do not commit the edit.
- [ ] Confirm IBM Bob shows the mode, five Skills, and nine MCP tools.
- [ ] Confirm the working tree is clean except for the machine-specific `.bob/mcp.json` edit.
- [ ] Disconnect the network after installation if testing offline runtime behavior.

## End-to-end run

- [ ] Register the frozen base and two changes.
- [ ] Prepare all four workspaces with no textual conflict.
- [ ] Run existing tests in base, A, B, and combined.
- [ ] Persist both normalized intent contracts.
- [ ] Persist interaction surfaces and ranked hypotheses.
- [ ] Generate a valid focused interaction test.
- [ ] Confirm the collision with an assertion failure.
- [ ] Apply the repair only in the combined workspace.
- [ ] Export `repair.patch` and `repair-summary.md`.
- [ ] Rerun the interaction test successfully.
- [ ] Rerun existing tests successfully.
- [ ] Complete stability at 50/50 with seed 20260926.
- [ ] Collect evidence with zero missing required artifacts.
- [ ] Generate `passport.json` and `passport.html` with `SAFE_TO_MERGE`.
- [ ] Load the real `passport.json` in the dashboard.
- [ ] Confirm original feature refs did not move.

## Rehearsal record

| Rehearsal | Date/time | Operator | Run ID | Duration | Result | Notes |
|---|---|---|---|---:|---|---|
| 1 |  |  |  |  | Pending |  |
| 2 |  |  |  |  | Pending |  |
| 3 |  |  |  |  | Pending |  |

## Backup run transfer from Windows

After choosing the best successful run, execute from the repository root in PowerShell:

```powershell
$runId = "REPLACE_WITH_RUN_ID"
Compress-Archive -Path "runs/$runId/*" -DestinationPath "jointly-backup-$runId.zip" -Force
```

Copy the ZIP to the submission machine. Do not edit its contents. Record its SHA-256 hash:

```powershell
Get-FileHash "jointly-backup-$runId.zip" -Algorithm SHA256
```

## Video checklist

- [ ] 1080p recording with readable editor and terminal text.
- [ ] Show IBM Bob mode and Jointly tools.
- [ ] Show all four existing-test workspaces passing.
- [ ] Show the intent-derived test fail for the expected reason.
- [ ] Show the isolated repair and passing rerun.
- [ ] Show 50/50 stability, passport, and dashboard verdict.
- [ ] Avoid exposing login credentials, access tokens, personal notifications, or unrelated tabs.
- [ ] Keep the final video in two locations before submission.
