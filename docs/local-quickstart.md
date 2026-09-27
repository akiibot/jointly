# Local quick start and trusted-project setup

Jointly's local mode has two deliberately separate paths. Start with the fixture path. Configure a real project only after the fixture passes and only when you trust that repository's code and configured scripts.

## Fixture-first path

Use Node 22.19.x from the repository root:

```bash
npm install
npm run build
npm test
npm run jointly -- doctor
npm run jointly -- setup
npm run local
```

Open the printed loopback URL. Sample, imported, and connected-local views are distinct. The connected page can run a clearly labeled lifecycle simulation, but real watsonx inference and generated-code execution remain disabled until their separate gates pass.

For IBM Bob IDE, reload the workspace after `setup`, select **Jointly – AI Merge Investigator**, and verify the five project Skills and nine `jointly` MCP tools. This manual IDE check is not implied by a successful setup command.

## One trusted local project

R1 supports one explicitly selected local Git repository at a time. The repository root is the directory containing `.git` and `jointly.yaml`; `project.root` is a separate, repository-relative application subdirectory. Do not point either field at an arbitrary user-supplied URL or accept commands from a browser form.

1. Work in the selected trusted repository checkout. Do not use a private or untrusted repository as a sandbox test.
2. Copy and review the Jointly configuration structure. Set `project.root` to the application subdirectory without `..`, an absolute path, or a symlink escape.
3. Configure exactly one common base and two explicit local or remote-tracking refs. Fetch them yourself first; Jointly does not fetch, switch, or guess refs.
4. Store the two original prompt files inside the repository and reference them by repository-relative paths.
5. Configure only reviewed build/test commands. The browser cannot supply commands, and model output cannot extend the allowlist.
6. Configure structured Vitest report paths for existing and generated tests.
7. Run `jointly doctor`. Resolve every deterministic failure before registration.

The current local executor uses credential-minimized child environments but is not a hostile-code sandbox. Repository scripts run with the developer's operating-system identity and could attempt to read other accessible files or processes. Consequently, website controls for real generated-code execution stay unavailable until the stronger executor-isolation and canary tests pass. Use a disposable machine or stronger external sandbox for code you do not fully trust.

## Provider and Bob setup are independent

Bob IDE is an optional supported reasoning workflow. It does not provide watsonx credentials to the website. The future website provider requires the five server-side `WATSONX_*` settings documented in `.env.example`, the participant-owned B1 adapter, and a separately authorized live capability check. Never put those values in `jointly.yaml`, prompts, browser storage, screenshots, or repository command environments.
