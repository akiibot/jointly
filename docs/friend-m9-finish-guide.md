# M9 completion guide for the Windows rehearsal operator

This guide contains the remaining steps required to complete Jointly's M9 submission milestone. Perform them on the Windows computer where IBM Bob is registered to the Protos team.

M9 is complete only after:

- three successful Bob-assisted end-to-end rehearsals;
- one archived successful run;
- one backup demonstration video;
- one final IBM Bob submission-readiness review screenshot.

## 1. Update the repository

Open PowerShell in the existing clone:

```powershell
cd "C:\Users\Y. Akib\jointly"
git status --short
```

The machine-specific `.bob/mcp.json` modification is expected. If `package-lock.json` is modified only because of an earlier installation, restore it before pulling:

```powershell
git restore package-lock.json
git pull origin main
npm ci
npm run build
npm test
```

Expected test results:

| Package | Test files | Tests |
|---|---:|---:|
| Checkout fixture | 4 | 38 |
| Deterministic core | 9 | 20 |
| Dashboard | 1 | 3 |
| MCP server | 7 | 10 |
| **Total** | **21** | **71** |

Confirm the latest commit:

```powershell
git log -1 --oneline
```

It should show `b52df20` or a newer commit.

## 2. Verify the frozen Git references

```powershell
git show -s --oneline jointly-demo-base
git show -s --oneline agent/coupon
git show -s --oneline agent/payment-retry
```

Expected commits:

```text
jointly-demo-base     57ffb46
agent/coupon          2b8990f
agent/payment-retry   2d12dbb
```

If the local agent branches are missing:

```powershell
git branch --track agent/coupon origin/agent/coupon
git branch --track agent/payment-retry origin/agent/payment-retry
```

Do not modify, merge, or commit to these feature branches.

## 3. Verify IBM Bob configuration

Open `.bob/mcp.json` and confirm that `cwd` is the absolute path of this clone:

```json
{
  "mcpServers": {
    "jointly": {
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"],
      "cwd": "C:/Users/Y. Akib/jointly"
    }
  }
}
```

Use forward slashes in the JSON path. Do not commit this machine-specific file.

Restart or reload IBM Bob, select **Jointly – AI Merge Investigator**, and confirm that Bob can discover:

- five Jointly project Skills;
- nine `jointly` MCP tools.

## 4. Prepare the rehearsal environment

Before each rehearsal:

1. Close unrelated and private tabs.
2. Disable notifications.
3. Hide passwords, access tokens, email, and personal messages.
4. Increase VS Code, terminal, and IBM Bob text size.
5. Open `docs/demo-script.md` and `docs/rehearsal-checklist.md`.
6. Record the rehearsal's start time, end time, and run ID.

The first two rehearsals do not need to be recorded. Record the third rehearsal as the backup demonstration video.

## 5. Run Rehearsal 1

Start a new IBM Bob task in **Jointly – AI Merge Investigator** mode and send:

```text
Run a complete Jointly checkout investigation rehearsal.

Use:
- base: jointly-demo-base
- change A: agent/coupon
- change A prompt: scenarios/checkout/coupon-prompt.md
- change B: agent/payment-retry
- change B prompt: scenarios/checkout/payment-retry-prompt.md

Follow the five Jointly project Skills in order and use the Jointly MCP tools for deterministic execution.

Requirements:
1. Register a new run.
2. Prepare base, change-a, change-b, and combined workspaces.
3. Run existing tests in all four workspaces.
4. Extract and persist both intent contracts.
5. Discover interaction surfaces and rank hypotheses.
6. Generate a focused interaction test.
7. Run it before repair with evidenceLabel before-repair.
8. Confirm only a valid assertion failure as a collision.
9. Apply the minimal repair only in the combined workspace.
10. Export repair.patch and repair-summary.md.
11. Rerun the generated test with evidenceLabel after-repair.
12. Rerun all existing tests.
13. Run 50 stability iterations with concurrency 4 and seed 20260926.
14. Collect all evidence.
15. Generate passport.json and passport.html only if all SAFE_TO_MERGE gates pass.

Do not modify or commit to the original feature branches. Do not merge or push anything. Report the run ID, test totals, stability result, missing evidence, verdict, and original branch hashes.
```

### Rehearsal success criteria

The final output must show:

- four isolated workspaces and no textual conflict;
- passing existing tests in base, change A, change B, and combined;
- before-repair classification `confirmed-collision`;
- expected HTTP `201` and observed HTTP `400`;
- repair limited to the combined workspace;
- after-repair classification `hypothesis-rejected`, exit code `0`;
- stability `50/50`, zero failures, seed `20260926`;
- `missingRequired: []`;
- verdict `SAFE_TO_MERGE`;
- unchanged original branch hashes.

Record the run ID, duration, and result in `docs/rehearsal-checklist.md`.

If any required item fails, do not count the rehearsal. Record the problem, correct it, and start another run from registration.

## 6. Run Rehearsal 2

Start a new IBM Bob task and use the same rehearsal prompt. It must register a new run ID rather than reuse Rehearsal 1.

Verify every success criterion again and fill the second row of `docs/rehearsal-checklist.md`.

## 7. Record Rehearsal 3

Use Windows Game Bar or OBS. To start and stop Windows Game Bar recording:

```text
Win + Alt + R
```

Recommended settings:

- 1080p recording;
- readable terminal and Bob text;
- notifications disabled;
- microphone enabled if the operator can explain the flow;
- no credentials or private content visible.

Start a third new IBM Bob task with the same rehearsal prompt. The recording should show:

1. IBM Bob's Jointly mode, five Skills, and nine MCP tools.
2. The frozen common base and feature commits.
3. Four isolated workspaces.
4. Existing tests passing in every workspace.
5. The extracted requirement IDs.
6. The `Order.total` interaction hypothesis.
7. The generated interaction test failing for the expected reason.
8. The minimal repair in the combined workspace only.
9. The generated interaction test passing after repair.
10. Existing tests still passing.
11. Stability `50/50` with zero failures.
12. `passport.json` reporting `SAFE_TO_MERGE`.
13. The original feature refs remaining unchanged.

Use `docs/demo-script.md` as the speaking guide.

## 8. Show the real run in the dashboard

After Rehearsal 3 finishes, run:

```powershell
npm run dev --workspace=@jointly/dashboard
```

Open the local URL printed by Vite. Select **Open passport**, then choose:

```text
runs\<REHEARSAL_3_RUN_ID>\passport.json
```

Show these screens:

1. Overview
2. Intent
3. Investigation
4. Repair
5. Passport

Finish the recording on the final verdict with `SAFE TO MERGE`, stability `50/50`, and zero failures visible.

Keep the original video outside the Git repository unless the competition explicitly requests it in the repository.

## 9. Archive the best completed run

Use the cleanest successful run—normally Rehearsal 3. Replace the placeholder below:

```powershell
$runId = "REPLACE_WITH_RUN_ID"
Compress-Archive `
  -Path "runs\$runId\*" `
  -DestinationPath "$env:USERPROFILE\Desktop\jointly-backup-$runId.zip" `
  -Force
```

Create a verification hash:

```powershell
Get-FileHash `
  "$env:USERPROFILE\Desktop\jointly-backup-$runId.zip" `
  -Algorithm SHA256
```

Record the SHA-256 hash in the rehearsal checklist or in a text file beside the ZIP.

Confirm that the archive contains:

- `manifest.json` and `workspaces.json`;
- intent contracts, interaction surfaces, and hypotheses;
- existing-test results and the generated test;
- before- and after-repair collision evidence;
- `repair.patch` and `repair-summary.md`;
- `stability.json` and `evidence-summary.json`;
- `passport.json` and `passport.html`.

Do not commit the large ZIP unless the team first confirms that the repository should contain it.

## 10. Request the final IBM Bob review

Complete all three rows in `docs/rehearsal-checklist.md`. Then start a final Bob task and send:

```text
Perform a final Jointly submission-readiness review only.

Inspect:
- README.md
- docs/architecture.md
- docs/demo-script.md
- docs/limitations.md
- docs/rehearsal-checklist.md
- bob_sessions/README.md
- the selected completed run and its passport
- the presence of the backup run ZIP and recorded demo video

Verify:
1. Three complete rehearsals are recorded as successful.
2. The selected run contains all required artifacts.
3. passport.json reports SAFE_TO_MERGE.
4. Stability is 50/50 with zero failures.
5. The seven existing canonical Bob screenshots are present.
6. The original feature refs remain unchanged.
7. The clean-clone build and 71 tests passed.
8. No application or feature code needs further changes.

Do not modify application code, feature branches, or run evidence. Report a submission-ready or not-ready verdict and list any remaining blockers.
```

When Bob reports submission-ready, capture a screenshot that includes the verdict and the absence of remaining blockers. Save it exactly as:

```text
bob_sessions/protos_task08_submission_review_summary.png
```

Do not use an unrelated screenshot for this filename.

## 11. Commit only the final evidence

Check the working tree:

```powershell
git status --short
```

Stage only the completed checklist and final screenshot:

```powershell
git add docs/rehearsal-checklist.md
git add bob_sessions/protos_task08_submission_review_summary.png
git diff --cached --name-only
```

The staged list must not contain:

```text
.bob/mcp.json
package-lock.json
runs/
node_modules/
dist/
```

Commit and push:

```powershell
git commit -m "docs: complete final submission evidence"
git push origin main
```

## 12. Report the completion details

Send the team:

- all three rehearsal run IDs;
- the backup ZIP filename and SHA-256 hash;
- confirmation that the video was recorded and backed up;
- the final Bob review screenshot;
- the final Git commit hash.

After these items are independently verified, M9 can be marked complete.
