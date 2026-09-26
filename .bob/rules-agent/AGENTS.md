# Project Coding Rules (Non-Obvious Only)

- **pnpm workspaces** — always run commands from the package directory or use `pnpm --filter <pkg>`, not from root.
- **MCP server is STDIO**, not HTTP — use `@modelcontextprotocol/sdk` with `StdioServerTransport`.
- **Workspace paths are resolved from `jointly.yaml` `project.root`**, not from cwd — validate at config load time.
- **Git operations use Git CLI** (not libgit2/nodegit) — wrap with the command runner in `packages/core/src/git.ts`.
- **All test commands come from `jointly.yaml` `commands.test`** — never hard-code `npm test` in the runner.
- **Output from test runs must be truncated** before storing (prevent huge artifact files); store full output to a `.log` file, store bounded summary in JSON.
- **Vitest single-test pattern:** `npm test -- --run <filename or describe/it string>` from the package directory.
- **`runs/<run-id>/`** directories are created by `register_run` — do not create them ad-hoc elsewhere.
- **Repairs are patch exports**, not direct branch commits — use `git diff` against the pre-repair combined workspace state.
- **`passport.json` verdict field** must be one of the 6 allowed strings: `SAFE_TO_MERGE`, `COLLISION_CONFIRMED`, `REPAIR_REQUIRES_REVIEW`, `INDEPENDENT_CHANGE_FAILED`, `TEXTUAL_CONFLICT`, `INSUFFICIENT_EVIDENCE`.
- **`bob_sessions/`** stores PNG screenshots of Bob task summaries — do not put generated code artifacts there.
