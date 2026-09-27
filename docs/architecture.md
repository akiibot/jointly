# Jointly architecture

## System boundary

Jointly separates probabilistic reasoning from deterministic execution. IBM Bob supplies proposals in the supported IDE + MCP mode; the website mode uses watsonx.ai. Both modes call the same Jointly core, which controls Git, commands, artifacts, and verdict gates so claims remain reproducible and auditable.

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

### Reasoning providers

IBM Bob uses the `ai-merge-investigator` mode and five project Skills in the IDE + MCP workflow. The website's planned watsonx stages follow provider-independent contracts for the same bounded responsibilities:

1. Convert each original prompt into observable intent requirements.
2. Discover shared entities, state, APIs, and side effects.
3. Rank collision hypotheses and link them to requirement IDs.
4. Author a focused executable interaction test.
5. Distinguish a true assertion failure from an invalid test or environment failure.
6. Explain the root cause and choose the smallest repair that preserves both intents.
7. Review evidence and request the final passport verdict.

Neither provider directly modifies feature branches, creates arbitrary workspaces, executes unrestricted shell commands, or manufactures a verdict without persisted evidence. Repository commands run with an explicit credential-free environment policy rather than inheriting server secrets.

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
| `run_stability_matrix` | Repeat one named interaction scenario with bounded worker concurrency and a deterministic per-iteration seed schedule; report request concurrency separately or as unknown. |
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
  ├─ execution-classified collision evidence
  ├─ requirement-linked runtime diagnosis
  ├─ repair.patch + repair summary
  ├─ after-repair interaction evidence
  ├─ 50-iteration stability result
  ├─ fresh repair review bound to the verification context
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
- a separate runtime diagnosis linked to the same hypothesis, requirements, and before-repair artifact;
- an exported repair and explanation;
- a passing after-repair interaction test;
- a complete stability run with zero failures.
- a fresh approving repair review bound to the exact repair, unchanged generated test, test evidence, stability, and requirement decisions.

Otherwise the passport uses a non-safe state such as `COLLISION_CONFIRMED`, `REPAIR_REQUIRES_REVIEW`, `TEXTUAL_CONFLICT`, or `INSUFFICIENT_EVIDENCE`.

## Local deterministic operation and network boundaries

After dependencies have been installed, deterministic fixture checks and the supported Bob/MCP repository operations use local Git refs, local Node.js processes, the STDIO MCP transport, and local artifacts. Dependency installation may require registry access. Bob authentication and genuine website watsonx inference require their respective services and must never be described as offline. The current connected-local website exposes an authenticated, explicitly simulated lifecycle only; its capability response keeps real inference and generated-code execution unavailable.

Pure hosted policy contracts currently test owner/repository/installation isolation, exact-candidate approval, staleness, privileged paths, and publication idempotency. They are not a hosted API, GitHub integration, worker sandbox, deployment, or publication result.
