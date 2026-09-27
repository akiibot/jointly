# Submission rehearsal checklist

Complete the applicable lane of this sheet three times from a fresh clone or clean disposable directory. Record the workflow, date, operator, run ID, duration, and result for each rehearsal. Bob/MCP and website rehearsals are separate evidence; one must not be relabeled as the other.

## Repository-side verification

On 2026-09-27, commit `330c1c2` was cloned into a disposable directory. A locked `npm ci` installation, full build, and all 71 tests completed successfully with a clean working tree. This verifies clean-clone setup and deterministic code health; it does **not** count as one of the three required Bob-assisted end-to-end rehearsals.

Dependency installation requires registry access unless every tarball is already cached. Once `npm ci` has completed, build, tests, MCP execution, artifact generation, and dashboard presentation use local dependencies and require no external service.

## Preflight

- [ ] Clone `https://github.com/akiibot/jointly.git` into a new directory.
- [ ] Confirm the pinned Node.js 22.19.x runtime and Git are installed.
- [ ] Run `npm install` while dependencies are available.
- [ ] Run `npm run build` successfully.
- [ ] Run `npm test`; expect 165 passing tests plus 1 gated live test skipped across 34 files at this Revision 6 checkpoint. If the suite changes, record the actual total and update this dated expectation.
- [ ] Update `.bob/mcp.json` with this clone's absolute path; do not commit the edit.
- [ ] Confirm IBM Bob shows the mode, five Skills, and nine MCP tools.
- [ ] Confirm the working tree is clean except for the machine-specific `.bob/mcp.json` edit.
- [ ] Disconnect the network after installation if testing offline runtime behavior.

## Lane A — Bob IDE + MCP regression and end-to-end run

- [ ] Confirm the automated MCP protocol regression passes: register run, prepare four workspaces, read bounded diff, and execute structured existing tests.
- [ ] Confirm this automated check is not recorded as a Bob IDE session.

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

## Lane B — website workflow

### Current honest UI regression

- [ ] Sample mode is visibly historical/unverified and does not claim a live run.
- [ ] Imported mode preserves provenance; malformed input does not fall back to sample success.
- [ ] Connected-local mode displays `fake-replay` and the unavailable real-inference/generated-code/isolation capabilities.
- [ ] `npm run local` serves the dashboard from loopback, establishes an HttpOnly same-origin session, and shows deterministic preflight, exact frozen refs/prompts, and read-only history without printing the token.
- [ ] No Run button appears while the shared deterministic driver and executor isolation are unavailable.

### Final hackathon vertical slice — leave unchecked until real

- [x] B1 watsonx adapter has authentic Bob snapshot evidence and its Codex-ported non-live contract suite passes (22 passed; live test skipped).
- [ ] A separately authorized live smoke check verifies the intended account, region, model, and project/space.
- [ ] Repository-code executor isolation and canary tests pass before any model-generated code executes.
- [ ] Only the authorized operator can access the selected repository, run, events, artifacts, resolution, candidate, and publication route.
- [ ] One approved synthetic public repository and two frozen PR heads are selected through the website.
- [ ] Real watsonx stages produce schema-valid proposals with persisted provider provenance.
- [ ] Shared deterministic execution reproduces the collision and verifies the isolated repair.
- [ ] Equivalent Bob/MCP and website inputs produce the same canonical classifications, evidence gates, and scoped verdict.
- [ ] The operator reviews the exact current candidate and explicitly approves publication.
- [ ] One integration PR is created from that approved candidate; source branches are unchanged.
- [ ] Deployment and public access checks pass without exposing credentials or another user's artifacts.

## Rehearsal record

| Rehearsal | Workflow | Date/time | Operator | Run ID | Duration | Result | Notes |
|---|---|---|---|---|---:|---|---|
| 1 |  |  |  |  |  | Pending |  |
| 2 |  |  |  |  |  | Pending |  |
| 3 |  |  |  |  |  | Pending |  |

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
- [ ] Show the website lane and its actual provider/capability state; never disguise fake replay as watsonx.
- [ ] Show all four existing-test workspaces passing.
- [ ] Show the intent-derived test fail for the expected reason.
- [ ] Show the isolated repair and passing rerun.
- [ ] Show 50/50 stability, passport, and dashboard verdict.
- [ ] If publication is demonstrated, show the explicit approval and exact resulting integration PR; otherwise label it pending.
- [ ] Avoid exposing login credentials, access tokens, personal notifications, or unrelated tabs.
- [ ] Keep the final video in two locations before submission.
