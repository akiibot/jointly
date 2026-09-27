# Windows handoff for the reserved IBM Bob work

This runbook starts from the prepared, committed handoff branch. It does not mark
Bob Task B1, Bob Task B2, a live watsonx request, deployment, or publication as
complete. Record the exact handoff branch and commit before the Windows operator
starts.

## 1. Install the prerequisites

Install Git for Windows, the official Node.js 22.19.0 MSI matching the machine's
architecture, and IBM Bob IDE for Windows. Jointly pins Node 22.19.x. Bob IDE is
the supported interface for these tasks; installing Bob Shell is not required.

Restart PowerShell after installation and verify:

```powershell
git --version
node --version
npm --version
```

`node --version` must report `v22.19.0`.

## 2. Clone and verify the exact handoff

Replace `<HANDOFF_BRANCH>` and `<HANDOFF_COMMIT>` with the values supplied by
the maintainer:

```powershell
Set-Location "$HOME\Documents"
git clone --branch <HANDOFF_BRANCH> https://github.com/akiibot/jointly.git
Set-Location jointly
git status --short
git rev-parse HEAD
```

The status command must print nothing and the commit must equal
`<HANDOFF_COMMIT>`. Do not start from an older `main` checkout.

## 3. Establish the baseline

```powershell
npm ci
npm run build
npm test
npm run jointly -- doctor --json
```

Before B1, the prepared baseline is 143 passing tests across 32 test files.
`deterministicReady` must be `true`. `providerReady` remains `false` until the
real adapter and five watsonx settings are present; that is expected at this
stage.

Record the starting commit, then create the participant-owned branch:

```powershell
git rev-parse HEAD
git switch -c bob/b1-watsonx-adapter
```

If the baseline fails, preserve the output and stop before editing.

## 4. Generate the Windows-local MCP registration

```powershell
npm run jointly -- setup
```

The setup command writes `.bob\mcp.generated.json`. If `.bob\mcp.json` does not
exist, copy it:

```powershell
Copy-Item .bob\mcp.generated.json .bob\mcp.json
```

If `.bob\mcp.json` already exists, manually merge only the generated `jointly`
entry into its `mcpServers` object. Never replace an existing file blindly, and
never copy another developer's machine-specific MCP file. Both generated files
are ignored by Git.

## 5. Open and verify IBM Bob IDE

1. Open IBM Bob and sign in with the participant's IBMid.
2. Open the cloned `jointly` folder and confirm that it is trusted.
3. Open Bob chat with **Ctrl+Alt+B**.
4. In Bob's MCP settings, enable **Use MCP Servers** and restart `jointly` if
   necessary.
5. Confirm that `jointly` exposes exactly nine MCP tools.
6. Confirm that the five project Skills are available.

Do not auto-approve repository command execution. Review every proposed command
and diff.

## 6. Perform reserved task B1

Open and read these files before prompting Bob:

- `AGENTS.md`
- `docs/improvement-implementation-plan.md`
- `docs/implementation-inventory.md`
- `docs/bob-task-briefs.md`
- `packages/watsonx-adapter/CONTRACT.md`

Copy the complete prompt under **B1 — Implement the real watsonx.ai adapter**
from `docs/bob-task-briefs.md` into Bob without shortening it. The authoritative
deliverables and nine acceptance tests are in that section.

During B1:

- do not place credentials in source, `.env`, Bob chat, logs, screenshots, URLs,
  or Git;
- do not make a live or paid request during mock/contract implementation;
- do not weaken schemas, budgets, deterministic verdicts, or redaction rules;
- do not report mocked transport tests as live watsonx evidence.

After implementation, run:

```powershell
npm run build
npm test
npm run jointly -- doctor --json
git diff --check
git status --short
git diff --stat
```

Update `docs\bob-development-evidence.md` only with the authentic participant,
Bob session, starting commit, resulting diff/commit, tests, findings, live checks,
and limitations. Leave `Live watsonx check` as not run until an authorized call
actually succeeds.

Before committing, confirm that `.env`, `.bob\mcp.json`, credential files, and
logs are absent from `git status`. Commit only reviewed B1 changes:

```powershell
git add packages\watsonx-adapter packages\reasoning docs\bob-development-evidence.md package.json package-lock.json
git status --short
git commit -m "Implement watsonx inference adapter in Bob IDE"
```

Adjust the staged paths if B1 legitimately changes another reviewed file; never
use `git add .` around credential-bearing work.

## 7. Run the separately authorized live smoke check

Only after the mocked suite passes and the operator explicitly authorizes the
provider call, set the five values for the current PowerShell process. Obtain
them from an approved secret channel, not the repository:

```powershell
$env:WATSONX_SERVICE_URL = "<service-url>"
$env:WATSONX_PROJECT_ID = "<project-id>"
$env:WATSONX_MODEL_ID = "<model-id>"
$env:WATSONX_API_VERSION = "<api-version>"
$secureKey = Read-Host "watsonx API key" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
  $env:WATSONX_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
  Remove-Variable secureKey
  Remove-Variable keyPointer
}
```

Run only the smoke command documented by the completed B1 adapter. Record the
model, region/service URL classification, request ID when returned, sanitized
result, cost/usage when returned, and exact outcome. Do not record the key.

Clear the process environment immediately afterward:

```powershell
Remove-Item Env:WATSONX_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:WATSONX_SERVICE_URL -ErrorAction SilentlyContinue
Remove-Item Env:WATSONX_PROJECT_ID -ErrorAction SilentlyContinue
Remove-Item Env:WATSONX_MODEL_ID -ErrorAction SilentlyContinue
Remove-Item Env:WATSONX_API_VERSION -ErrorAction SilentlyContinue
```

Close Bob and PowerShell after the check.

## 8. Perform reserved task B2

After B1 and one complete fixture execution, create a separate branch from the
reviewed B1 result:

```powershell
git switch -c bob/b2-integration-review
```

Copy the complete B2 prompt from `docs/bob-task-briefs.md` into Bob. Exercise
both Bob IDE + MCP and website workflows, add regression tests for confirmed
findings, and record B2 separately in `docs/bob-development-evidence.md`.

Finish with:

```powershell
npm run build
npm test
git diff --check
git status --short
```

No integration PR may be published until the authorized operator explicitly
approves the exact candidate digest and current source and target revisions.
