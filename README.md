# Jointly

**Intent-aware pre-merge verification for parallel AI-generated changes.**

**Previously published dashboard:** [jointly-ai-merge.vercel.app](https://jointly-ai-merge.vercel.app) (current availability and deployment health were not re-verified in this implementation pass)

Jointly investigates two changes created from one common Git base. Its supported IBM Bob IDE + MCP workflow uses deterministic tools to isolate the changes, run their existing tests, inspect bounded diffs, execute a proposed interaction test, verify a repair, repeat that test for stability, and produce a gated Merge Safety Passport. The improvement program adds a website workflow powered by watsonx.ai; both modes share the same deterministic verification core.

The checkout demonstration contains a deliberately hidden semantic collision: percentage coupons change the accounting identity for `Order.total`, while payment retry independently validates the original base identity. Every existing test passes in isolation and after a clean textual merge; only an intent-derived interaction test exposes the incompatibility.

## What the demonstration proves

- Passing branch and combined test suites do not prove two independently generated changes are semantically compatible.
- IBM Bob performs reasoning in the supported IDE + MCP mode. The planned website mode uses watsonx.ai for equivalent bounded proposals.
- Jointly performs deterministic execution: Git isolation, allowlisted commands, evidence persistence, stability runs, and passport assembly.
- Source branches remain untouched. Repairs exist only in the isolated combined workspace.
- A `SAFE_TO_MERGE` verdict is impossible until all evidence gates pass.

## Requirements

- Node.js 22.19.x (the repository-pinned release line)
- npm
- Git
- IBM Bob IDE for the optional assisted investigation workflow
- Separate watsonx.ai credentials only for the future website inference path; they are not required for deterministic checks

## Install and verify

```bash
git clone https://github.com/akiibot/jointly.git
cd jointly
npm install
npm run build
npm test
npm run jointly -- doctor
```

The expected test totals are:

| Workspace | Test files | Tests |
|---|---:|---:|
| Checkout fixture | 4 | 38 |
| Deterministic core | 17 | 55 |
| Dashboard | 1 | 11 |
| MCP server | 8 | 19 |
| Reasoning contracts/fake | 1 | 7 |
| Local lifecycle/API | 1 | 13 |
| watsonx adapter (mocked/offline; live file skipped) | 2 | 22 passed, 1 skipped |
| **Total** | **34** | **165 passed, 1 skipped** |

## Configure IBM Bob

Build the project, then generate a machine-local configuration without committing absolute paths:

```bash
npm run jointly -- setup
```

This creates ignored `.bob/mcp.json` with absolute paths, including paths containing spaces. If a configuration already exists, it is preserved and the proposed entry is written to `.bob/mcp.generated.json` for manual merging. Restart or reload IBM Bob, choose **Jointly – AI Merge Investigator**, and confirm that the five project Skills and nine `jointly` MCP tools are discoverable. This manual discovery is not claimed complete by `setup`.

For the fixture-first path and the bounded procedure for selecting one trusted local project, see [Local quick start and trusted-project setup](docs/local-quickstart.md). General installation does not require a Protos account. Bob IDE and watsonx provider readiness are separate optional checks.

## Run the deterministic preflight

The repository uses the frozen base tag and explicit `origin/agent/*` remote-tracking refs in [`jointly.yaml`](jointly.yaml), so a normal clone does not need machine-local feature branches:

```bash
npm run jointly -- doctor
npm run jointly -- analyze
```

`doctor` checks the pinned runtime, Git/npm, dependencies, build output, config and prompt paths, exact refs/common base, and structured report configuration. It reports watsonx variable names but never values. The real adapter exists and passes mocked/offline tests, but provider authentication and model access remain unverified until the separately authorized live smoke test. It never fetches, switches branches, or silently substitutes a remote ref.

This creates four isolated workspaces—base, change A, change B, and combined—and runs the configured build and existing-test commands. It never switches or edits the developer's current branch.

For the complete Bob-assisted workflow, follow [`docs/demo-script.md`](docs/demo-script.md).

## Open the dashboard

The repository records a prior Vercel deployment URL, but this pass did not perform a live deployment or health check.

To build and serve the dashboard and read-only local investigation overview from one loopback origin:

```bash
npm run local
```

Open the printed `http://127.0.0.1:4317/?mode=local` URL. The server establishes an HttpOnly, same-origin browser session and displays deterministic preflight, exact frozen refs/prompts, and local run history. Run creation remains disabled until the shared deterministic driver and credential-separated executor isolation are complete.

For dashboard-only development:

```bash
npm run dev --workspace=@jointly/dashboard
```

Open the local URL printed by Vite. The dashboard starts with a bundled historical checkout passport, explicitly labeled legacy/unverified because it predates the current evidence schema. Select **Open passport** to display another completed run's `passport.json`, or provide a URL with `?passport=<path-or-url>`.

The dashboard contains no analysis logic. It presents the five required views from passport evidence only:

1. Change overview
2. Intent map
3. Investigation
4. Repair
5. Passport verdict

## Evidence and outputs

Each run is stored under `runs/<run-id>/`. Important artifacts include:

- `manifest.json` and `workspaces.json`
- `intents/*.json`, `interaction-surfaces.json`, and `hypotheses.json`
- `test-results/existing.json`
- before- and after-repair collision evidence
- `repair.patch` and `repair-summary.md`
- `stability.json`
- `failure-scenarios.json` for controlled validation runs
- `evidence-summary.json`
- `passport.json` and `passport.html`

[`bob_sessions/`](bob_sessions/) contains progressive IBM Bob screenshots required as submission evidence. See [`bob_sessions/README.md`](bob_sessions/README.md) for the canonical evidence map.

## Safety boundaries

- Exactly two changes from one common base
- Original feature refs are read-only
- Repairs are limited to the isolated combined workspace
- MCP commands are allowlisted; prompt input cannot execute arbitrary commands
- Test compilation or setup failures are classified as `test-invalid`, never as collisions
- `passport.json` is the dashboard's source of truth

See [`docs/architecture.md`](docs/architecture.md) for the system design and [`docs/limitations.md`](docs/limitations.md) for the honest MVP boundary.

## Repository map

```text
packages/core/          deterministic Git, workspace, execution, and evidence engine
packages/mcp-server/    nine local STDIO tools exposed to IBM Bob
packages/dashboard/     five-screen passport viewer
packages/reasoning/     provider-independent stage contracts and deterministic fake
packages/local-server/  loopback/session-protected checkpointed fake lifecycle
packages/watsonx-adapter/ Bob-originated real transport, ported to current contracts; live check pending
examples/checkout/      golden semantic-collision fixture
scenarios/checkout/     independent agent prompts and project invariants
.bob/                   Bob mode, rules, Skills, and local MCP registration
runs/                   generated per-run evidence (ignored except .gitkeep)
bob_sessions/           progressive Bob usage evidence
```

## Submission documents

- [Final 2:52 video production script](docs/hackathon-video-production-script.md)
- [Windows IBM Bob recording runbook](docs/windows-bob-recording-runbook.md)
- [Pitch deck, KPI, Q&A, and submission kit](docs/hackathon-pitch-submission-kit.md)
- [Problem & Solution Statement — under 500 words](docs/submission-problem-solution-statement.md)
- [IBM Bob Usage Statement — under 500 words](docs/submission-bob-usage-statement.md)
- [Architecture](docs/architecture.md)
- [Live demo script](docs/demo-script.md)
- [Limitations](docs/limitations.md)
- [Rehearsal checklist](docs/rehearsal-checklist.md)
- [Current implementation inventory and allocation](docs/implementation-inventory.md)
- [Local quick start and trusted-project setup](docs/local-quickstart.md)
- [Windows handoff for the reserved IBM Bob work](docs/windows-bob-handoff.md)
- [Submission assets and source-linked final checks](docs/submission-source-checklist.md)
- [H1 operational runbook](docs/h1-operational-runbook.md)
- [Reserved Bob IDE task briefs](docs/bob-task-briefs.md)
- [Windows M9 completion guide](docs/friend-m9-finish-guide.md)
