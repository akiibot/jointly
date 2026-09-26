# Project Architecture Constraints (Non-Obvious Only)

- **IBM Bob does all AI reasoning; the MCP server is purely deterministic.** Never put intent extraction, hypothesis generation, or repair logic inside MCP tools — those belong in Bob skills/subagents.
- **Four workspaces, not two.** Base, Base+A, Base+B, and Base+A+B are all required. Skipping Base is a common mistake.
- **The `examples/checkout/` demo app is also a package in the pnpm workspace.** It has its own `package.json` and is the git repository that hosts the coupon and payment-retry branches — it is not a subfolder of `packages/`.
- **Two separate git repos or worktrees:** the Jointly tool repo and the `examples/checkout/` repo (which has agent branches). These are different git roots.
- **Stability runner uses a fixed seed (`20260926`)** — non-deterministic seeds make demo metrics unrepeatable.
- **Textual merge conflict is classified separately** (`TEXTUAL_CONFLICT` verdict) and stops semantic analysis — don't conflate it with a semantic collision.
- **`run_stability_matrix` must preserve failing iteration logs**, not just the count — judges will want to inspect them.
- **The repair patch is produced from `git diff` between the pre-repair and post-repair states of the combined workspace** — not between combined workspace and main branch.
- **`.bob/mcp.json` requires absolute `cwd` path** — this must be updated per developer machine; it cannot be committed with a relative path and work out of the box.
- **Phase order matters:** the golden scenario (manually verified collision) must be stable before writing any Jointly engine code — the scenario is the test fixture for everything else.
