# Problem & Solution Statement

Parallel AI coding agents are fast, but merge safety is still judged mostly through text conflicts and existing tests. That leaves a dangerous gap: two changes can merge cleanly, pass independently, and even pass the combined regression suite while violating each other’s intent. Reviewers see green checks without seeing the interaction nobody thought to test.

Jointly is an intent-aware, pre-merge verification system for that gap. It takes two changes from a common Git base, freezes their exact commits, and prepares four isolated workspaces: the base, each change alone, and the combined candidate. IBM Bob guides a structured investigation through five project Skills, while nine typed MCP tools give Jointly—not the model—control over Git, test execution, artifacts, and verdict gates.

The demonstration uses a synthetic checkout repository. One branch adds percentage coupons and changes how `Order.total` is interpreted. Another adds payment-retry protection that assumes the earlier total identity. Both branches pass their tests, the combined tree has no textual conflict, and all existing combined tests pass. Jointly extracts evidence-cited intent contracts, finds the shared `Order.total` interaction, and generates the missing test. That test exposes the real behavior: a checkout expected to return HTTP 201 instead returns 400.

A repair is applied only to the isolated combined candidate. Jointly preserves the before-repair evidence, exports the exact patch, reruns the same generated test, reruns existing tests, and performs a deterministic 50-iteration stability check. Only complete evidence can produce a scoped Merge Safety Passport. Missing or invalid evidence yields an explicit non-safe verdict; AI cannot declare its own proposal safe.

This approach is original because it treats intent as testable evidence rather than model confidence. It complements CI and code review by generating the cross-change test neither contributor anticipated, while keeping every repository action reproducible and auditable. The current working mode runs in IBM Bob through MCP and includes a dashboard for inspecting the result. The roadmap productizes the same verification core as a secure watsonx.ai-powered GitHub service for one authorized operator, with explicit human approval before publishing an integration pull request.

**Copy note:** remove this note before submission. This statement is under 500 words. Recheck the signed-in platform limit before pasting.
