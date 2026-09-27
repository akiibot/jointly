# Jointly MCP setup

`.bob/mcp.json` is machine-local and ignored. The repository keeps only
`.bob/mcp.example.json`; no contributor's absolute path is committed.

After cloning Jointly on another machine:

1. Run `npm install` and `npm run build`.
2. Run `npm run jointly -- doctor` and resolve deterministic blockers.
3. Run `npm run jointly -- setup`. If an existing MCP file is present, merge the
   generated `.bob/mcp.generated.json` entry manually; setup never overwrites it.
4. Reload the MCP configuration in IBM Bob.
5. Confirm that the `jointly` server exposes exactly nine tools before spending Bobcoins.

Do not point the server at an untrusted repository. Jointly executes only commands allowlisted in `jointly.yaml`, uses isolated worktrees, and never repairs source branches directly.
