# Windows IBM Bob recording runbook

This runbook is for the teammate who still has IBM Bob allowance. Its goal is to capture genuine Bob + Jointly workflow evidence efficiently, without spending allowance on unrelated implementation or exposing secrets.

## Before the teammate starts

The exact prepared recording revision is `e44fe1e5ae8eb26763e8d5f00e207b58cc348139` on the published branch `codex/finish-b1-adapter`. The teammate must still record the SHA actually used and confirm that GitHub serves it before recording.

Do not record against a moving `main` branch and do not merge anything for the demonstration.

## 1. Prepare Windows and recording

1. Use the registered IBM Bob account and a clean Windows desktop.
2. Install Git and IBM Bob if they are not already installed.
3. Use Node **22.19.x**, not Node 24. In PowerShell, check:

   ```powershell
   node --version
   npm --version
   git --version
   ```

4. If `node --version` is not `v22.19.x`, install/select Node 22.19.x with the team's existing Node version manager or the official Node 22 archive. Close and reopen PowerShell, then check again. Do not continue with Node 24.
5. Disable notifications and close email, chat, password managers, cloud dashboards, and personal browser tabs.
6. Set Windows display scaling to 100% or 125%. Set Bob/editor zoom to 125–150% and terminal font to at least 18 px.
7. Configure OBS or Xbox Game Bar for 1920×1080, 30 fps, microphone on. Make a ten-second audio test.

## 2. Clone the exact recording revision

Use a short path. Replace `<RECORDING-SHA>` with the full SHA supplied by the owner.

```powershell
cd C:\Users\$env:USERNAME
git clone https://github.com/akiibot/jointly.git jointly-demo
cd jointly-demo
git fetch origin
git switch --detach <RECORDING-SHA>
git rev-parse HEAD
git status --short
```

The SHA must match exactly and `git status --short` should initially be empty. A detached checkout is intentional: it prevents an accidental commit to a feature branch.

Confirm the frozen fixture refs:

```powershell
git show -s --oneline jointly-demo-base
git show -s --oneline origin/agent/coupon
git show -s --oneline origin/agent/payment-retry
```

If the two local fixture branch names are absent, create only local tracking names:

```powershell
git branch agent/coupon origin/agent/coupon
git branch agent/payment-retry origin/agent/payment-retry
```

Never switch to, commit to, merge, or push those fixture branches.

## 3. Install and verify before using Bob allowance

Run each command separately. Do not paste PowerShell prompts such as `PS C:\...>` or continuation markers such as `>>`.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
npm.cmd run jointly -- doctor --json
npm.cmd run jointly -- setup
```

Expected current repository test result:

- 165 passed across 34 test files;
- one live watsonx smoke test skipped;
- no failed tests.

The skipped live smoke test is expected and must not be described as live watsonx validation.

`setup` creates or proposes a machine-specific `.bob/mcp.json`. It must point to this clone and use the built MCP server. If `.bob/mcp.generated.json` is produced because a config already exists, manually merge its `jointly` entry into `.bob/mcp.json`.

The effective entry should resemble:

```json
{
  "mcpServers": {
    "jointly": {
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"],
      "cwd": "C:/Users/NAME/jointly-demo"
    }
  }
}
```

Use forward slashes in JSON. Do not commit `.bob/mcp.json` or `.bob/tmp/`.

## 4. Confirm Bob before recording

1. Open the `jointly-demo` folder in IBM Bob.
2. Reload/restart Bob after setup.
3. Select **Jointly – AI Merge Investigator**.
4. Confirm the five project Skills are visible:
   - `extract-intent-contract`
   - `discover-interactions`
   - `generate-interaction-tests`
   - `repair-collision`
   - `generate-merge-passport`
5. Confirm the nine `jointly` MCP tools are visible:
   - `register_run`
   - `prepare_workspaces`
   - `read_change_diff`
   - `run_existing_tests`
   - `run_generated_test`
   - `run_stability_matrix`
   - `collect_evidence`
   - `export_resolution_patch`
   - `generate_passport`
6. If a tool is missing, stop. Rebuild, check `.bob/mcp.json`, and reload Bob. Do not consume allowance debugging through chat.

## 5. Capture the efficient Bob sequence

Start a fresh Bob task only after all local checks pass. Begin screen recording, show the mode/Skills/tools for five seconds, then paste this exact prompt:

```text
Perform the Jointly checkout demonstration using the supported Bob IDE + MCP workflow.

Use exactly:
- base: jointly-demo-base
- change A: agent/coupon
- change A prompt: scenarios/checkout/coupon-prompt.md
- change B: agent/payment-retry
- change B prompt: scenarios/checkout/payment-retry-prompt.md

Follow the five Jointly project Skills in order. Use only the typed jointly MCP tools for Git, workspace, test, evidence, patch, stability, and passport actions. Do not use watsonx, do not modify either source branch, do not merge or push, and do not expose credentials.

Required workflow:
1. Register a new run and report the frozen base and change commit hashes.
2. Prepare base, change-a, change-b, and combined isolated workspaces.
3. Run existing tests in all four workspaces and use their structured results.
4. Extract two evidence-cited intent contracts and persist them in the run.
5. Discover and rank interaction hypotheses; investigate the shared Order.total behavior.
6. Generate one focused interaction test and persist it.
7. Run that exact test before repair with evidenceLabel before-repair. Treat only a valid assertion failure tied to the hypothesis as a confirmed collision.
8. Persist a diagnosis tied to requirement IDs. If requirements are ambiguous, stop for resolution instead of inventing authority.
9. Apply the smallest proposed repair only in the isolated combined workspace and export the reviewable patch.
10. Run the exact unchanged interaction test with evidenceLabel after-repair, then rerun every existing suite.
11. Run 50 stability iterations with concurrency 4 and seed 20260926.
12. Collect evidence and generate the Merge Safety Passport only if every required gate passes.

At each milestone, briefly state the tool or Skill used and the artifact created. At the end, report the run ID, frozen commits, existing-test outcomes, before/after classifications, generated-test digest, stability result, missing evidence, scoped verdict, and whether original branch hashes stayed unchanged. Do not claim live watsonx inference, hosted isolation, GitHub publication, or deployment.
```

## 6. What must appear in the recording

Capture these milestones. Pause briefly on each result so it can be edited into the final video:

1. `Jointly – AI Merge Investigator`, five Skills, and nine MCP tools.
2. A new run ID and frozen commit hashes.
3. Four isolated workspaces and no textual conflict.
4. Existing tests passing in all four workspaces.
5. The two requirement-cited intent contracts.
6. The ranked `Order.total` interaction hypothesis.
7. The generated test source.
8. Before-repair assertion: expected HTTP `201`, observed `400`.
9. Diagnosis tied to the hypothesis and requirement IDs.
10. Candidate-only repair patch.
11. The unchanged generated test passing after repair.
12. Existing tests still passing.
13. Stability `50/50`, zero failures, seed `20260926`.
14. `missingRequired: []` and the real final verdict.
15. Original source-branch hashes unchanged.

If the real verdict is not safe, record the blocker. Do not edit the evidence or prompt Bob to force `SAFE_TO_MERGE`.

## 7. Capture the dashboard

After the run succeeds, leave Bob open and start the dashboard from a separate PowerShell window:

```powershell
npm.cmd run dev --workspace=@jointly/dashboard
```

Open the printed local URL. Import:

```text
runs\<RUN-ID>\passport.json
```

Record five short clips: Overview, Intent, Investigation, Repair, and Passport. End on the scoped verdict and stability evidence. Do not show the connected-local simulation as live watsonx execution.

## 8. Save authentic Bob evidence

Before closing the task:

1. Capture the Bob task session summary with the task ID, Bob version, workspace, and completion summary visible.
2. Take a screenshot of the Bob mode/Skills/tools.
3. Save the raw screen recording outside the Git repository.
4. Record the run ID, task ID, operator name, date/time zone, exact Git SHA, and Bob version in a text file.
5. Copy the run directory and create a SHA-256 hash:

   ```powershell
   $runId = "REPLACE-WITH-RUN-ID"
   Compress-Archive -Path "runs\$runId\*" -DestinationPath "$env:USERPROFILE\Desktop\jointly-run-$runId.zip" -Force
   Get-FileHash "$env:USERPROFILE\Desktop\jointly-run-$runId.zip" -Algorithm SHA256
   ```

6. Send the owner the raw MP4, screenshots, task/run metadata, ZIP hash, and any failure notes through an authorized file-sharing channel.

Every team member whose Bob activity is claimed should provide their own task-session summary screenshot, as required by the supplied submission screen.

## 9. Quota-saving fallback

If the full Bob run is consuming too much allowance, stop after a genuine `register_run`, `prepare_workspaces`, and structured existing-test execution. Capture those results and the Bob task summary. The editor may then use clearly labeled `RECORDED RUN ARTIFACT` footage from a previously completed run for the remaining evidence. A short genuine Bob interaction plus authentic persisted artifacts is preferable to a failed, improvised run. Do not claim the replay was generated in that same session.

## 10. Final safety checks

Before sending footage, scrub it frame by frame for API keys, cookies, tokens, email addresses, local personal paths, notifications, and private repository names. Confirm the recording shows no `git push`, no mutation of the feature refs, and no live watsonx claim. Preserve the original footage; edit only a copy.
