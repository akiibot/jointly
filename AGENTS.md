# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project

**Jointly** — intent-aware pre-merge verification for parallel AI-generated changes. This repository is **greenfield**; no code exists yet. [`BUILD_GUIDE.md`](BUILD_GUIDE.md) is the authoritative product and implementation guide. Read it before making any architectural decisions.

## Project rules

- Use **TypeScript** for the application, core engine, and MCP server.
- Use **Vitest** for all automated tests. Every behavior change requires tests.
- **IBM Bob performs all AI reasoning** (intent extraction, interaction investigation, test generation, collision repair, verification) — the MCP server and core engine are deterministic only.
- **Never modify the original feature branches** during collision analysis. Work only in isolated workspaces.
- **Apply repairs only in the isolated combined workspace** (Base+A+B), never in A or B directly.
- **Never classify a test compilation or setup error as a semantic collision** — use the `test-invalid` classification instead.
- **Do not build the dashboard** until the golden checkout scenario (Phase 1) works end-to-end.
- **MVP is strictly two changes from one common Git base.** Do not generalize to N changes prematurely.

## Intended stack

- **Language:** TypeScript, Node.js
- **Tests:** Vitest (`npm test -- --run` for non-watch; `npm test -- --run <pattern>` for a single test)
- **Package manager:** pnpm (workspace monorepo via `pnpm-workspace.yaml`)
- **Sample API:** Fastify (minimal, no auth, no production plugins)
- **Persistence:** in-memory repository only for MVP. Repository interfaces must be defined so SQLite could be added later, but do not implement SQLite during the hackathon unless all P0 milestones are already complete.
- **MCP server:** local STDIO transport
- **Dashboard:** React/Vite or static HTML reading `passport.json`
- **Config format:** YAML (`jointly.yaml`)
- **Artifacts:** JSON, Markdown, HTML, patch files

## Repository structure (to be created)

```
jointly/
├── packages/
│   ├── core/src/          # config, manifest, workspace, git, runner, evidence, stability, passport
│   ├── mcp-server/src/    # server.ts + tools/
│   └── dashboard/src/
├── examples/checkout/     # the demo scenario (src/, tests/)
├── scenarios/checkout/    # prompt files and expected-collision description
├── runs/                  # per-run artifact output (gitignored except .gitkeep)
├── .bob/
│   ├── mcp.json           # MCP server registration (absolute path required)
│   ├── custom_modes.yaml  # ai-merge-investigator mode
│   ├── rules-ai-merge-investigator/
│   └── skills/            # 5 project skills
├── jointly.yaml           # top-level run configuration
└── bob_sessions/          # Bob session screenshot evidence
```

## Critical conventions from the spec

- **Workspace isolation is non-negotiable.** Never analyze by switching the developer's working branch. Create 4 isolated workspaces: Base, Base+A, Base+B, Base+A+B.
- **Repairs go only in the combined workspace.** Never apply repairs to the original branches.
- **MCP tools must use allowlisted commands only.** No arbitrary command execution from prompt input.
- **`passport.json` is the single source of truth** for the dashboard — dashboard has zero analysis logic.
- **`runs/<run-id>/`** is the artifact directory layout; see `BUILD_GUIDE.md §14` for the full schema.
- **Collision classification is strict:** a compile error in a generated test is `test-invalid`, not `confirmed-collision`.
- **MCP server `.bob/mcp.json`** requires the absolute path to the project root — update before demo.

## Key data models (TypeScript interfaces)

Defined in `BUILD_GUIDE.md §14`:
- `RunManifest`, `ChangePackage`, `IntentContract`, `IntentRequirement`
- `InteractionSurface`, `CollisionHypothesis`, `CollisionEvidence`, `StabilityResult`

## MCP tools to implement

`register_run`, `prepare_workspaces`, `read_change_diff`, `run_existing_tests`, `run_generated_test`, `run_stability_matrix`, `collect_evidence`, `export_resolution_patch`, `generate_passport`

## Bob custom mode

Slug: `ai-merge-investigator` — rules live in `.bob/rules-ai-merge-investigator/`

## Stability defaults

Iterations: 50, Concurrency: 4, Seed: fixed (`20260926` per spec example)

## Build phases (implementation order)

1. Golden scenario (checkout demo + manually authored collision test)
2. Deterministic core (`npm run jointly -- analyze` prepares workspaces + runs tests)
3. MCP server
4. Bob mode + 5 skills
5. Generated interaction test (**most important milestone**)
6. Repair loop
7. Stability verification
8. Passport + dashboard
9. Rehearsals + submission artifacts
