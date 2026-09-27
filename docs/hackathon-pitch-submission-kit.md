# Jointly hackathon pitch and submission kit

**Prepared:** 2026-09-27
**Audience:** judges, technical reviewers, and the final submission operator
**Current honest product:** IBM Bob IDE + Jointly MCP investigation, deterministic verification core, and evidence dashboard
**Roadmap:** hosted watsonx.ai + GitHub workflow with isolation, authorization, and explicit publication approval

## 1. The pitch in one breath

**One-liner:** Jointly catches semantic collisions between parallel AI-generated changes by generating the interaction test nobody wrote, verifying an isolated repair, and issuing an evidence-backed Merge Safety Passport.

**Twenty-second pitch:** Two AI agents can each pass their tests and still break the product when their changes meet. Jointly freezes both changes, isolates them in four workspaces, uses IBM Bob to investigate their intent, and generates the missing cross-change test. A deterministic core—not the model—executes the test, verifies a candidate repair, reruns regressions and stability checks, and produces an auditable Merge Safety Passport.

**Closing line:** Before AI code meets production, make the interaction prove itself.

## 2. Executive project documentation

### Problem

Git detects overlapping text, not overlapping assumptions. Existing CI validates tests that developers already anticipated. With multiple humans or AI agents working from one base, independent changes can alter the meaning of the same business concept without touching the same lines. This creates a semantic collision: clean merge, green tests, wrong combined behavior.

### Target users

- engineering teams using multiple coding agents or parallel feature branches;
- reviewers responsible for integration branches and release candidates;
- platform teams that need reproducible evidence instead of an AI confidence score.

### Solution

Jointly investigates two frozen changes from a common base. It prepares base, change-A, change-B, and combined workspaces; runs existing tests; extracts evidence-cited intent; discovers shared interaction surfaces; generates a focused cross-change test; classifies its execution; verifies a minimal candidate-only repair; reruns the unchanged test and regressions; performs stability checks; and assembles the result into a scoped Merge Safety Passport.

### Why it is different

Jointly does not ask a model whether code “looks safe.” It makes the risky interaction executable and treats deterministic evidence as the authority. AI can propose intent, a test, a diagnosis, and a repair, but it cannot run arbitrary repository operations or override missing evidence. The final verdict is bound to exact commits, artifacts, and verification gates.

### Golden demonstration

The approved synthetic checkout fixture contains two branches from one base:

- `agent/coupon` adds percentage coupons and changes total accounting;
- `agent/payment-retry` adds retry validation based on the earlier total identity.

The branches merge without a textual conflict. Each independent suite passes, and existing combined tests pass. Jointly identifies `Order.total` as their shared semantic surface and generates the missing interaction test. Before repair, the test expects HTTP 201 and observes 400. The isolated repair is then tested against the exact same test and the existing suites, followed by a 50-iteration stability matrix.

### Architecture

```text
IBM Bob IDE
  ├─ Jointly custom mode
  ├─ 5 project Skills
  └─ 9 typed MCP tools
             │
             ▼
Shared deterministic verification core
  ├─ frozen Git identities + 4 isolated workspaces
  ├─ bounded diffs and structured command results
  ├─ generated-test classification
  ├─ candidate-only repair + patch export
  ├─ regression and stability execution
  └─ evidence gates + Merge Safety Passport
             │
             ▼
Evidence dashboard
  └─ Overview · Intent · Investigation · Repair · Passport

Roadmap proposal lane: watsonx.ai → same verification core
Roadmap publication lane: explicit human approval → one integration PR
```

### Trust model

- The current Bob/MCP workflow is for a trusted local repository; it is not a hostile-code sandbox.
- Original source branches are not modified by an investigation.
- Generated code is never accepted as proof; it must be executed by the deterministic core.
- A valid collision requires a meaningful assertion tied to the hypothesis—not setup, import, syntax, timeout, zero-test, or skipped-test failure.
- A safe verdict requires complete intent, before/after test, repair, regression, stability, and evidence records.
- Live credentials must never enter child execution environments. Full hosted isolation, cross-user authorization, and canary-secret tests remain gates for the hosted release.

### Current state versus roadmap

| Capability | Current demonstration | Roadmap |
| --- | --- | --- |
| Bob IDE investigation | Working and supported | Preserved |
| Five Skills and nine MCP tools | Working | Preserved through compatibility tests |
| Four-workspace deterministic core | Working | Shared by hosted workflow |
| Generated interaction test and repair verification | Working on the approved fixture | Generalized to an approved repository profile |
| Evidence dashboard | Working for sample/import/local evidence | Authenticated hosted run viewer |
| watsonx adapter | Implemented; 22 mocked/offline tests pass | Authorized live inference and orchestration |
| Live watsonx run | Not verified | Required before claiming hosted AI execution |
| Hosted multi-user isolation/authorization | Not complete | Mandatory before any hosted release |
| GitHub integration PR | Not published by this build | Explicit candidate review and approval before one PR |

## 3. Pitch deck blueprint

Use eight slides. Keep each slide to one idea and one proof image.

### Slide 1 — Hook

**Headline:** Two green PRs. One broken checkout.
**Visual:** two green checks converging into `201 expected → 400 observed`.
**Say:** “Git found no conflict. Existing tests found no conflict. The interaction still broke.”

### Slide 2 — The missing layer

**Headline:** CI tests what we anticipated. Jointly tests how changes interact.
**Visual:** Text conflict detection and existing CI leave a highlighted “semantic interaction” gap.
**Evidence:** the two fixture changes alter one shared business concept without a textual overlap.

### Slide 3 — How Jointly works

**Headline:** Isolate → Investigate → Verify → Passport.
**Visual:** four-stage workflow with four workspaces under Isolate.
**Say:** “AI proposes. The deterministic core executes and gates the verdict.”

### Slide 4 — The proof

**Headline:** Jointly generated the test neither agent wrote.
**Visual:** `Order.total` hypothesis, test failure, small repair, passing same-test digest.
**Evidence:** expected 201, observed 400 before repair; unchanged test passes after repair; 50/50 stability.

### Slide 5 — IBM Bob application

**Headline:** A structured investigator, not an unrestricted agent.
**Visual:** Bob mode plus the five Skills and nine MCP tools.
**Say:** “Bob handles bounded reasoning. Jointly owns Git, execution, artifacts, and verdict gates.”

### Slide 6 — Verified build KPIs

**Headline:** Evidence already under test.
**Visual:** metric tiles:

- 165 tests passed;
- 34 test files;
- 5 Bob Skills;
- 9 typed MCP tools;
- 4 isolated workspaces;
- 50 stability iterations;
- 0 original source branches modified.

Small footnote: one separate live watsonx smoke test skipped; no live-provider claim.

### Slide 7 — Business value and differentiation

**Headline:** Review the interaction, not another AI opinion.
**Visual:** comparison table.

| Approach | Finds text conflicts | Runs existing tests | Generates cross-change test | Evidence-gated repair | Auditable passport |
| --- | --- | --- | --- | --- | --- |
| Git merge | Yes | No | No | No | No |
| Conventional CI | Indirectly | Yes | No | No | Logs only |
| General AI review | Sometimes | Sometimes | Possible | Not inherently | Narrative |
| Jointly | Yes | Yes | Yes | Yes | Yes |

**Business hypothesis:** reduce reviewer uncertainty and prevent semantic integration regressions as agent parallelism grows. Do not attach an unmeasured percentage.

### Slide 8 — Roadmap and close

**Headline:** From working Bob workflow to secure hosted verification.
**Visual:** Now / Next / Later.

- **Now:** one synthetic public repository, Bob + MCP, generated interaction test, verified repair, passport.
- **Next:** one authorized operator, genuine watsonx inference, isolated execution, credential canaries, same deterministic evidence core.
- **Later:** GitHub selection, explicit approval, one integration PR, then carefully expanded repository support.

**Close:** “Before AI code meets production, make the interaction prove itself. Jointly.”

## 4. Judging-criteria mapping

| Criterion from supplied submission screen | What to emphasize | Proof to show |
| --- | --- | --- |
| Application of Technology | Bob is integral to the supported workflow; Skills constrain reasoning and MCP tools perform deterministic work. | Bob mode, five Skills, nine MCP tools, authentic session summary. |
| Presentation | One concrete story, visible failure, visible repair, visible passport; minimal jargon. | The 2:52 directed script with 122 seconds of action and captions. |
| Business Value | Parallel AI development creates integration risk that text merge and existing CI miss. | Clean merge + green existing tests + generated failing interaction test. |
| Originality | Convert cross-change intent into a new executable test, then gate a repair with evidence. | `Order.total` hypothesis, unchanged test digest, 50/50 stability, passport. |

## 5. KPI framework

### Verified build metrics you may claim now

| KPI | Value | Evidence |
| --- | ---: | --- |
| Automated tests passed | 165 | Full workspace test run on 2026-09-27 |
| Test files passed | 34 | Full workspace test run |
| Live smoke tests skipped | 1 | Credential-gated watsonx test; not a success claim |
| Bob project Skills | 5 | `.bob/skills/` and Bob discovery |
| Typed MCP tools | 9 | MCP server registration and tests |
| Isolated workspaces per run | 4 | Base, A, B, combined |
| Golden-run stability | 50/50 | Persisted stability artifact |
| Original source branches modified | 0 | Frozen refs before/after the investigation |

### Pilot KPIs to measure later

- semantic collisions confirmed per 100 candidate integrations;
- generated-test precision after excluding infrastructure failures;
- median time from frozen inputs to a reviewable passport;
- repair acceptance rate after human review;
- escaped integration defects compared with ordinary CI;
- reviewer time per integration candidate;
- flaky-test rate across deterministic reruns;
- cost and latency per watsonx stage;
- percentage of runs blocked correctly for incomplete evidence.

These are measurement targets, not current statistics.

## 6. Business model and go-to-market hypotheses

Keep this short unless a judge asks. The initial user is an engineering team already running parallel agents. A plausible product is a GitHub application with repository-level policy, usage-based investigations, and an enterprise tier for retention, audit export, and self-hosted execution. The first pilot should stay narrow: one approved synthetic/public repository and one authorized operator. Validate willingness to pay only after measuring prevented regressions and reviewer time; do not present pricing or market size as established fact.

## 7. Judge Q&A

**Why is this not just CI?**
CI runs tests someone already wrote. Jointly reasons across two change intents to generate the missing interaction test, then subjects that test and any repair to deterministic execution.

**Why use AI at all?**
The hard part is identifying a plausible cross-change interaction and expressing it as a focused test. Bob provides bounded reasoning for that step. Deterministic tools remain the authority for Git state, execution, evidence, and verdicts.

**Can the model declare code safe?**
No. A safe passport is assembled only when every required evidence gate passes for exact frozen inputs. Missing or invalid evidence produces a non-safe outcome.

**What works today?**
The IBM Bob + MCP workflow, shared deterministic core, approved checkout fixture, generated-test/repair verification path, and evidence dashboard. The repository test baseline is 165 passing tests with one gated live watsonx test skipped.

**Is watsonx live in this demo?**
No. The real adapter exists and passes mocked/offline contract tests, but provider credentials/model access and end-to-end orchestration have not been verified. That is explicitly roadmap work.

**Why show a website?**
It demonstrates the evidence experience and the direction of the product. Sample, imported, and simulated/local states are labeled. They are not represented as a live hosted investigation.

**Is it secure for arbitrary repositories?**
Not yet. The current mode assumes a trusted local repository. A hosted release is blocked on child-environment credential separation, canary-secret tests, execution isolation, and authorization between users, runs, and artifacts.

**Does it automatically merge code?**
No. The current demonstration modifies only an isolated combined candidate. The roadmap requires explicit human approval before publishing one integration PR and never auto-merges the source branches.

**How do you prevent a generated test from being changed after it fails?**
Jointly preserves the test artifact and digest, then requires the same test to pass after repair. It also reruns the existing suites and stability matrix.

**What was IBM Bob's contribution?**
Bob supported architecture, fixture, MCP, intent, test, repair, passport, and dashboard development tasks; authentic session summaries are preserved. Bob also produced the first watsonx adapter snapshot. Codex performed the later port to current contracts and additional checks; the attribution is intentionally split.

**What is the biggest current limitation?**
The proof is fixture-first and local. Live watsonx access, secure hosted execution, GitHub authorization, and approved PR publication remain unverified.

## 8. Submission asset checklist

### Required by the supplied signed-in screenshots

- [ ] Problem & Solution Statement is at most 500 words.
- [ ] IBM Bob Usage Statement is at most 500 words.
- [ ] Public repository is accessible while logged out.
- [ ] Repository contains relevant Bob-assisted code/files.
- [ ] Repository contains a readable IBM Bob task-session summary screenshot from each team member whose Bob contribution is claimed.
- [ ] MP4 is no longer than three minutes.
- [ ] At least 90 seconds visibly show the solution in action.
- [ ] Video narration explains what is being demonstrated.
- [ ] Video clearly demonstrates IBM Bob usage.

### Frequently missed items to check on the live form

- [ ] Exact deadline and time zone; do not infer it from the event end date.
- [ ] Team members, project category, technology tags, and contact details.
- [ ] Project title, short description, long description, Bob statement, repository URL, and demo/application URL.
- [ ] License file and third-party attribution are appropriate for a public submission.
- [ ] Cover image dimensions, slide-deck field, video upload size/codec, and any thumbnail requirements.
- [ ] Captions/transcript and readable color contrast.
- [ ] No secrets in Git history, screenshots, logs, run artifacts, or video frames.
- [ ] Final Git SHA is recorded and public; README matches what the video claims.
- [ ] Deployment URL is opened in a private/logged-out browser and tied to the intended build.
- [ ] All links work from a different device and without the owner's local session.
- [ ] Submission preview is reviewed after upload; MP4 audio and duration survive processing.
- [ ] Final receipt/status, timestamp, and screenshots are saved.

### Recommended submission folder outside Git

```text
Jointly-submission/
  final-video.mp4
  final-video-transcript.txt
  pitch-deck.pdf
  cover-image.png
  problem-solution.txt
  bob-usage.txt
  repository-sha.txt
  bob-session-summaries/
  raw-recordings/
  selected-run.zip
  selected-run.sha256.txt
  submission-receipt/
```

## 9. Final five-minute pre-submit check

1. Open the repository URL in a private browser and confirm the exact final SHA.
2. Open the demo URL in a private browser; verify it makes no live-watsonx claim.
3. Play the final MP4 locally from 00:00 to the end; confirm it is under 3:00 and contains at least 90 seconds of action.
4. Paste the two statements, then use the platform's displayed character/word counters.
5. Confirm every claimed team member has a relevant Bob session-summary screenshot.
6. Review the preview for broken links or clipped text.
7. Submit, save the receipt/status and timestamp, and do not keep editing the public revision unless the platform permits resubmission.

## 10. Source and uncertainty record

The numeric media and statement limits in this kit come from the signed-in submission screenshots supplied by the participant on 2026-09-27. Those screenshots are the best current source for the final form, but the participant must still recheck the live fields before submission. The repository's broader source/uncertainty ledger is in `docs/submission-source-checklist.md`. Where that file or an older plan disagrees with the live signed-in platform, record the discrepancy and follow the live platform.
