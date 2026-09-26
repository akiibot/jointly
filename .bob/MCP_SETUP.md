# Jointly MCP setup

`.bob/mcp.json` contains the absolute path for the primary hackathon machine.

After cloning Jointly on another machine:

1. Run `npm install` and `npm run build`.
2. Replace the `cwd` value in `.bob/mcp.json` with that clone's absolute path.
3. Reload the MCP configuration in IBM Bob.
4. Confirm that the `jointly` server exposes exactly nine tools before spending Bobcoins.

Do not point the server at an untrusted repository. Jointly executes only commands allowlisted in `jointly.yaml`, uses isolated worktrees, and never repairs source branches directly.
