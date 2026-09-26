# Jointly

**Intent-aware pre-merge verification for parallel AI-generated changes.**

**Live dashboard:** [jointly-ai-merge.vercel.app](https://jointly-ai-merge.vercel.app)

Jointly investigates two changes created from one common Git base. It gives IBM Bob deterministic tools to isolate the changes, run their existing tests, inspect bounded diffs, execute a Bob-authored interaction test, verify a repair, repeat that test for stability, and produce a gated Merge Safety Passport.

The checkout demonstration contains a deliberately hidden semantic collision: percentage coupons change the accounting identity for `Order.total`, while payment retry independently validates the original base identity. Every existing test passes in isolation and after a clean textual merge; only an intent-derived interaction test exposes the incompatibility.

## What the demonstration proves

- Passing branch and combined test suites do not prove two independently generated changes are semantically compatible.
- IBM Bob performs the reasoning: intent extraction, hypothesis formation, interaction-test design, root-cause analysis, and repair selection.
- Jointly performs deterministic execution: Git isolation, allowlisted commands, evidence persistence, stability runs, and passport assembly.
- Source branches remain untouched. Repairs exist only in the isolated combined workspace.
- A `SAFE_TO_MERGE` verdict is impossible until all evidence gates pass.

## Requirements

- Node.js 18 or newer
- npm
- Git
- IBM Bob with a registered Protos team account for the full assisted workflow

## Install and verify

```bash
git clone https://github.com/akiibot/jointly.git
cd jointly
npm install
npm run build
npm test
```

The expected test totals are:

| Workspace | Test files | Tests |
|---|---:|---:|
| Checkout fixture | 4 | 38 |
| Deterministic core | 9 | 20 |
| Dashboard | 1 | 3 |
| MCP server | 7 | 10 |
| **Total** | **21** | **71** |

## Configure IBM Bob

Build the project first. Then edit [`.bob/mcp.json`](.bob/mcp.json) so `cwd` is the absolute path of the clone on the machine running IBM Bob:

```json
{
  "mcpServers": {
    "jointly": {
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"],
      "cwd": "/absolute/path/to/jointly"
    }
  }
}
```

Windows example:

```json
"cwd": "C:/Users/Your Name/jointly"
```

Do not commit this machine-specific edit. Restart or reload IBM Bob, choose **Jointly – AI Merge Investigator**, and confirm that the five project Skills and nine `jointly` MCP tools are discoverable.

## Run the deterministic preflight

The repository already contains the frozen base and both feature refs expected by [`jointly.yaml`](jointly.yaml):

```bash
npm run jointly -- analyze
```

This creates four isolated workspaces—base, change A, change B, and combined—and runs the configured build and existing-test commands. It never switches or edits the developer's current branch.

For the complete Bob-assisted workflow, follow [`docs/demo-script.md`](docs/demo-script.md).

## Open the dashboard

The public demonstration is available at [jointly-ai-merge.vercel.app](https://jointly-ai-merge.vercel.app). It is deployed automatically from the connected GitHub repository through Vercel.

For local development:

```bash
npm run dev --workspace=@jointly/dashboard
```

Open the local URL printed by Vite. The dashboard starts with a bundled, deterministic checkout passport. Select **Open passport** to display another completed run's `passport.json`, or provide a URL with `?passport=<path-or-url>`.

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
examples/checkout/      golden semantic-collision fixture
scenarios/checkout/     independent agent prompts and project invariants
.bob/                   Bob mode, rules, Skills, and local MCP registration
runs/                   generated per-run evidence (ignored except .gitkeep)
bob_sessions/           progressive Bob usage evidence
```

## Submission documents

- [Architecture](docs/architecture.md)
- [Live demo script](docs/demo-script.md)
- [Limitations](docs/limitations.md)
- [Rehearsal checklist](docs/rehearsal-checklist.md)
- [Windows M9 completion guide](docs/friend-m9-finish-guide.md)
