# Jointly hackathon video — final production script

**Target runtime:** 2:52 (hard stop before 3:00)
**Solution-in-action footage:** 2:02, from 00:30 through 02:32
**Primary proof:** the working IBM Bob IDE + Jointly MCP workflow
**Secondary proof:** the evidence dashboard and public project page
**Roadmap, not a current claim:** hosted watsonx.ai investigation and approved integration-PR publication

This script is based on the requirements shown in the signed-in submission screenshots supplied on 2026-09-27: MP4, three minutes maximum, at least 90 seconds of the solution in action, narration, and a clear demonstration of IBM Bob usage. Recheck those fields immediately before submission.

## Directing rules

- Record clean 1080p footage, then edit it; do not attempt one uninterrupted live take.
- Keep the cursor still except when it is pointing at the next proof item.
- Never show credentials, browser profiles, email, notifications, or terminal history unrelated to Jointly.
- Use large text: editor 125–150%, browser 125%, terminal font at least 18 px.
- Put a small persistent label in the lower-left: `WORKING NOW · Bob IDE + MCP`.
- Put a different amber label on roadmap frames: `ROADMAP · not live in this demo`.
- Never label the website simulation, mocked adapter tests, or historical passport as live watsonx inference.
- Use the actual test output captured from the final revision. The verified 2026-09-27 baseline is 165 passed and one separately gated live smoke test skipped.

## Frame-by-frame edit and narration

| Time | Picture and action | Exact narration | On-screen text |
| --- | --- | --- | --- |
| 00:00–00:06 | Cold open. Split screen: two green branch checks snap together; the checkout response flips from `201` to `400`. Add a short impact sound. | **“Two changes. Two green test suites. One broken checkout.”** | `A clean merge can still be wrong.` |
| 00:06–00:14 | Freeze on the failed combined behavior. Highlight `expected 201`, `received 400`. | “Parallel AI agents can each be correct alone, yet violate each other’s intent when combined.” | `The missing test is the interaction.` |
| 00:14–00:23 | Jointly title card, then a simple four-box animation: Isolate → Investigate → Verify → Passport. | “Jointly is an intent-aware, pre-merge verification layer. AI proposes; deterministic evidence decides.” | `JOINTLY` / `Evidence before merge.` |
| 00:23–00:30 | Show the two fixture branches and their common base in a compact Git graph. | “Here, one branch adds coupons. Another adds payment retry validation. Git sees no textual conflict.” | `agent/coupon` + `agent/payment-retry` |
| 00:30–00:42 | **Action begins.** IBM Bob window. Show `Jointly – AI Merge Investigator`, the five project Skills, and the nine `jointly` MCP tools. Pan slowly, no typing. | “Inside IBM Bob, our Jointly mode guides the investigation through five focused Skills, while nine typed MCP tools control every repository action.” | `WORKING NOW · IBM Bob + Jointly MCP` / `5 Skills · 9 typed tools` |
| 00:42–00:54 | Bob calls `register_run`, then `prepare_workspaces`. Cut to the returned base, A, B, and combined workspace records. | “Jointly freezes the exact commits and creates four isolated workspaces: the base, each change alone, and the combination. The source branches remain untouched.” | `4 isolated workspaces` / `0 source branches modified` |
| 00:54–01:06 | Show structured existing-test results for all four workspaces, all green. Avoid lingering on scrolling logs. | “Every existing suite passes—including the combined workspace. Normal CI would approve this merge.” | `Existing tests: PASS` / `Textual merge: CLEAN` |
| 01:06–01:20 | Show the two intent contracts side by side. Highlight requirement IDs and the shared symbol `Order.total`. Animate arrows into one interaction hypothesis. | “Bob extracts bounded intent with citations. Jointly discovers that both changes touch the meaning of `Order.total`, then ranks that shared behavior as the highest-risk interaction.” | `Coupon changes total accounting` / `Retry assumes the old identity` |
| 01:20–01:35 | Show the generated interaction test, then the before-repair execution record. Zoom onto `expected 201` and `received 400`. | “It generates the test neither agent anticipated. The test fails for the expected assertion—not from setup, syntax, or a missing dependency—confirming a semantic collision.” | `Generated interaction test` / `201 expected → 400 observed` |
| 01:35–01:49 | Show the diagnosis linking the failure to requirement IDs. Then show the small repair diff in the combined workspace only. | “The diagnosis is tied back to both requirements. A minimal repair is proposed only in the isolated combined candidate, and Jointly exports the exact patch for review.” | `Evidence-linked diagnosis` / `Candidate-only repair` |
| 01:49–02:04 | Show the exact same test digest before and after, now passing. Then show the four existing suites still green. | “Jointly reruns the exact same interaction test, verifies its digest, and reruns every existing suite. A changed test cannot masquerade as a fixed product.” | `Same test: PASS` / `Regressions: PASS` |
| 02:04–02:17 | Show `50/50`, zero failures, seed `20260926`, then `missingRequired: []`. | “The repaired candidate then passes fifty deterministic stability iterations with zero failures. Missing evidence blocks the verdict by design.” | `Stability 50/50` / `Missing evidence: 0` |
| 02:17–02:32 | Open the dashboard Passport view. Briefly cut across Overview, Intent, Investigation, Repair; land on the scoped `SAFE TO MERGE` card. | “The result is a Merge Safety Passport: frozen commits, intent, test evidence, repair, and a scoped verdict that can be audited instead of trusted blindly.” | `SAFE TO MERGE` / `for this exact candidate and evidence scope` |
| 02:32–02:42 | Metric card animation. Keep it factual and labeled “verified build metrics.” | “Today’s build has 165 passing automated tests across 34 files, five Bob Skills, nine MCP tools, four-workspace isolation, and fifty-run stability verification.” | `165 tests · 34 files` / `5 Skills · 9 tools · 4 workspaces · 50 iterations` |
| 02:42–02:49 | Amber roadmap frame. Diagram: current Bob lane and future hosted lane converge on one verification core. | “Next, we are productizing that same evidence core as a secure watsonx-powered GitHub service with explicit approval before publishing an integration PR.” | `ROADMAP · watsonx.ai + GitHub` / `Human approval before publication` |
| 02:49–02:52 | Return to the broken-checkout opening image, which resolves into the passport seal. Music/button sound ends sharply. | **“Before AI code meets production, make the interaction prove itself. Jointly.”** | `JOINTLY · Evidence before merge.` |

## Required capture list

Record these as separate clips so the editor can replace any failed live moment:

1. Bob mode name, five Skills, and nine MCP tools.
2. `register_run` response with the frozen base and two change commits.
3. `prepare_workspaces` response showing four workspaces and clean textual merge.
4. Structured existing-test results for base, A, B, and combined.
5. Intent contracts with requirement IDs and citations.
6. Ranked `Order.total` interaction hypothesis.
7. Generated test source and its before-repair assertion failure.
8. Evidence-linked diagnosis.
9. Repair diff limited to the combined workspace.
10. Same-test digest and passing after-repair result.
11. Passing regression results and stability `50/50` with seed `20260926`.
12. Evidence summary with `missingRequired: []` and the Passport verdict.
13. Dashboard Overview, Intent, Investigation, Repair, and Passport views.
14. A clean title/architecture graphic and a roadmap graphic.

## KPI discipline

Use only these verified engineering metrics in the video:

- 165 automated tests passed across 34 test files on code revision `e8269d6`; the final recording revision `e44fe1e` adds documentation only. One live watsonx smoke test was skipped because live access is not verified.
- five Bob project Skills;
- nine typed MCP tools;
- four isolated workspaces per investigation;
- fifty stability iterations in the golden demonstration;
- zero original feature branches modified by the investigation;
- one generated interaction test exposing the known checkout collision.

Do not invent time saved, defect-reduction percentages, users, revenue, accuracy, or market adoption. Those are future pilot KPIs, not measured results.

## Edit, audio, and delivery checklist

- Export MP4/H.264, 1920×1080, 30 fps, with an audio peak below 0 dB and clear narration.
- Aim for 2:52. Never submit a file at exactly 3:00; platform re-encoding can change duration.
- Add burned-in English captions and manually correct `watsonx.ai`, `MCP`, and `Jointly`.
- Use quick cuts during commands; keep every proof result visible for at least two seconds.
- Keep background music quiet enough that every technical noun is intelligible.
- Watch the exported MP4 from beginning to end on a second machine.
- Confirm action footage is at least 90 seconds; this cut contains approximately 122 seconds.
- Save the editable project, final MP4, clean narration, raw clips, and a backup copy outside the repository.

## Honest fallback if Bob fails during capture

Record one short genuine Bob session that shows the Jointly mode, tools, and at least one successful MCP call. Use previously persisted run artifacts for later proof shots, clearly captioned `RECORDED RUN ARTIFACT`. Do not pretend an edited replay is a live, uninterrupted run. If a final safe passport cannot be reproduced, show the real blocker and change the ending from `SAFE TO MERGE` to `EVIDENCE INCOMPLETE`; never manufacture a successful result.
