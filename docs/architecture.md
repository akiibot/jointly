# Jointly architecture

## System boundary

Jointly separates probabilistic reasoning from deterministic execution. IBM Bob decides what the changes mean and what interaction should be tested. Jointly controls Git, commands, artifacts, and verdict gates so those claims remain reproducible and auditable.

```text
Independent prompts + Git refs
              │
              ▼
┌───────────────────────────────┐
│ IBM Bob                       │
│ intent → hypothesis → test    │
│ root cause → minimal repair   │
└──────────────┬────────────────┘
               │ nine typed MCP tools over local STDIO
               ▼
┌───────────────────────────────┐
│ Jointly MCP server            │
│ validates input and delegates │
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ Deterministic core            │
│ Git · workspaces · commands   │
│ evidence · stability · gates  │
└──────────────┬────────────────┘
               ▼
 runs/<run-id>/passport.json ──────► presentation-only dashboard
```

## Responsibility split

### IBM Bob: reasoning

Bob uses the `ai-merge-investigator` mode and five project Skills to:

1. Convert each original prompt into observable intent requirements.
2. Discover shared entities, state, APIs, and side effects.
3. Rank collision hypotheses and link them to requirement IDs.
4. Author a focused executable interaction test.
5. Distinguish a true assertion failure from an invalid test or environment failure.
6. Explain the root cause and choose the smallest repair that preserves both intents.
7. Review evidence and request the final passport verdict.

Bob does not directly modify feature branches, create arbitrary workspaces, execute unrestricted shell commands through MCP, or manufacture a verdict without persisted evidence.

### Jointly: deterministic execution

The TypeScript core and MCP server:

- resolve and freeze the base and two change commits;
- prepare four isolated Git workspaces;
- expose bounded and redacted diffs;
- run only configured build, test, interaction-test, and stability commands;
- classify generated-test outcomes with explicit states;
- persist every input, command result, patch, and evidence link;
- export repairs only from the combined workspace;
- reject `SAFE_TO_MERGE` until intent, tests, collision, repair, and stability evidence are complete.

## Nine MCP tools

| Tool | Deterministic responsibility |
|---|---|
| `register_run` | Resolve the common base and exactly two change refs into a manifest. |
| `prepare_workspaces` | Create isolated Base, A, B, and A+B Git workspaces. |
| `read_change_diff` | Return a bounded, redacted diff for one registered change. |
| `run_existing_tests` | Run the allowlisted test command in one isolated workspace. |
| `run_generated_test` | Copy and run a generated test, then classify its result. |
| `run_stability_matrix` | Repeat the interaction test with bounded concurrency and a fixed seed. |
| `collect_evidence` | Validate required artifacts and link them to requirement IDs. |
| `export_resolution_patch` | Export uncommitted combined-workspace changes without touching source refs. |
| `generate_passport` | Assemble gated JSON and HTML passports from persisted evidence. |

## Workspace isolation

Every run freezes three source commits: common base, change A, and change B. Jointly then creates:

| Workspace | Contents | Purpose |
|---|---|---|
| `base` | Common base | Establish baseline health. |
| `change-a` | Base + coupon | Verify the first change independently. |
| `change-b` | Base + payment retry | Verify the second change independently. |
| `combined` | Base + A + B | Expose cross-change behavior and contain the repair. |

The developer's checkout is never switched. The `agent/coupon` and `agent/payment-retry` refs remain immutable throughout investigation. Only the combined workspace may contain the generated interaction test and repair, both intentionally uncommitted.

## Evidence flow

```text
manifest
  ├─ four-workspace existing tests
  ├─ normalized intent contracts
  ├─ shared interaction surfaces
  ├─ ranked hypotheses
  ├─ generated interaction test
  ├─ confirmed collision evidence
  ├─ repair.patch + repair summary
  ├─ after-repair interaction evidence
  ├─ 50-iteration stability result
  └─ evidence summary
       └─ passport.json + passport.html
            └─ dashboard
```

`passport.json` is the final machine-readable record and the dashboard's only data source. The dashboard is intentionally incapable of deciding whether a merge is safe.

## Verdict gate

`SAFE_TO_MERGE` requires all of the following:

- both intent contracts and linked requirements;
- passing existing tests in base, A, B, and combined;
- a valid before-repair `confirmed-collision` result;
- an exported repair and explanation;
- a passing after-repair interaction test;
- a complete stability run with zero failures.

Otherwise the passport uses a non-safe state such as `COLLISION_CONFIRMED`, `REPAIR_REQUIRES_REVIEW`, `TEXTUAL_CONFLICT`, or `INSUFFICIENT_EVIDENCE`.

## Offline operation

After dependencies have been installed, the demonstration uses only local Git refs, local Node.js processes, the STDIO MCP transport, and local artifacts. It requires no GitHub request, cloud service, database, or external API during a run.
