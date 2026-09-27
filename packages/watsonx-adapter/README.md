# @jointly/watsonx-adapter — participant-owned implementation slot

The real watsonx transport is intentionally not implemented here. It is reserved
for Bob IDE Task B1 in `docs/bob-task-briefs.md`.

The current implementation boundary, required inputs, expected package shape,
and acceptance reference are in `CONTRACT.md`.

The implementation must satisfy `InferenceTransport` from `@jointly/reasoning`
and its acceptance behavior without changing the shared request, response,
budget, cancellation, redaction, or error contracts. No SDK dependency, IAM
logic, endpoint, or claimed live result has been added by Codex.

Until B1 is delivered and a separate bounded live capability check succeeds,
the application must report watsonx inference as unavailable rather than using
a fake as if it were live.
