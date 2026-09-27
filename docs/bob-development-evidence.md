# IBM Bob IDE development evidence

Status: B1 has an authentic Bob implementation snapshot and a Codex compatibility
port. Offline verification is recorded below; the separately gated live watsonx
check has not been run. B2 was not performed because the available Bob budget
was exhausted.

Do not treat mocked tests as live-provider evidence. Codex-authored planning,
runner, compatibility, security, documentation, and verification changes remain
attributed to Codex rather than being assigned to Bob retrospectively.

## B1 — Real watsonx.ai adapter

- Status: Bob implementation preserved; Codex compatibility port implemented
- Participant: project collaborator using IBM Bob IDE (name not recorded)
- Bob version: 1.5.82
- Bob task/session ID: `47634a6502c2e9247f90f58a10cbca05`
- Session-summary screenshot: supplied in the implementation handoff; not stored
  in the repository because it contains local-machine UI context
- Bob starting commit: `c1a4dda8886694ac2fa9e32c807133f8b7c38004`
- Bob snapshot commit: `7b36558dd9d585a122533767e5d0942bf8fec932`
- Preserved snapshot branch: `bob/b1-watsonx-adapter-snapshot`
- Bob-authored work: initial `packages/watsonx-adapter` implementation,
  provider-contract tests, live-test gate, and adapter documentation; Bob also
  drafted an older reasoning-package implementation that was not integrated
  because the current branch already had a newer shared contract
- Codex-authored integration work: port to the current `ReasoningRequest` and
  `InferenceTransport` contracts; current error taxonomy; trusted-template and
  configured-model checks; deadline/cancellation behavior; canary redaction;
  fake/real contract regression; documentation corrections; full verification
- Tests: adapter mocked/offline suite passed 22 tests with the separately gated
  live test skipped; the full repository passed 165 tests across 34 files with
  that same one live test skipped; production dependency audit found 0
  vulnerabilities after updating the compatible IBM core dependency to 5.6.2
- Live watsonx check: not run
- Prepared handoff: `docs/bob-task-briefs.md` and `packages/watsonx-adapter/CONTRACT.md`
- Limitations: no provider request, live credential validation, live latency,
  model availability, or provider-cost evidence has been claimed

## B2 — Shared-workflow integration review/debugging

- Status: not started; unavailable within the exhausted Bob allowance
- Participant: pending
- Bob task/session ID: pending
- Session-summary screenshot: pending
- Starting commit: pending
- Resulting commit or diff: pending
- Concrete findings: pending
- Fixes/regressions: pending
- Tests: pending
- Limitations: no Bob-authored B2 review or evidence exists; do not mark it
  complete or reattribute an independent Codex review to Bob
