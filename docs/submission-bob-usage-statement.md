# IBM Bob Usage Statement

IBM Bob was a substantive development environment and is also a supported operating workflow for Jointly.

During development, the team used Bob tasks to plan the architecture, build and validate the synthetic checkout scenario, develop agent changes and prompts, implement the MCP server, analyze intent, generate and run the interaction probe, verify the repair, assemble the Merge Safety Passport, and review the dashboard. The repository preserves task-session summary screenshots under `bob_sessions/` for those activities. The final submission must include a relevant session-summary screenshot from each team member whose Bob work is claimed.

Jointly adds a custom **Jointly – AI Merge Investigator** mode, five focused project Skills, and nine typed MCP tools. The Skills guide Bob through intent extraction, interaction discovery, interaction-test generation, collision repair, and passport generation. The MCP tools perform deterministic operations such as registering a run, preparing four isolated Git workspaces, reading bounded diffs, running existing and generated tests, executing a stability matrix, collecting evidence, exporting the repair patch, and generating the passport. This division is deliberate: Bob proposes bounded reasoning, while Jointly controls repository mutations, test execution, evidence persistence, and the final verdict gates.

Bob also produced the initial watsonx.ai transport implementation, tests, and documentation in task `47634a6502c2e9247f90f58a10cbca05`, preserved at snapshot commit `7b36558dd9d585a122533767e5d0942bf8fec932`. That task used an older internal reasoning contract and exhausted its allowance. Codex—not Bob—ported the delivered adapter to the current contracts, added compatibility and security checks, and completed mocked/offline verification. The current suite passes 22 adapter tests while one credential-gated live smoke test is skipped. We do not present those mocked tests as live watsonx evidence.

In the working demonstration, Bob runs the investigation against two frozen checkout changes. It helps extract cited intent contracts, identifies the shared `Order.total` risk, generates the missing cross-change test, explains the confirmed failure, and proposes the minimal isolated repair. Jointly then proves the result by rerunning the unchanged test, the regression suites, and fifty stability iterations before issuing a scoped passport.

The roadmap uses watsonx.ai for bounded proposals in a hosted GitHub workflow while preserving the same deterministic verification core and explicit approval before publishing an integration pull request. Live watsonx inference, hosted isolation, and automatic publication are not claimed as complete in the current demonstration.

**Copy note:** remove this note before submission. This statement is under 500 words. Recheck the signed-in platform limit before pasting.
