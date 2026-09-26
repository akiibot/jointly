# MVP limitations

Jointly is a focused hackathon prototype. Its narrow boundaries are deliberate and should be stated clearly during judging.

## Supported scope

- Exactly **two changes** from one common Git base
- TypeScript and Node.js repositories
- npm workspace build and Vitest-based demonstration fixture
- Local Git refs and local process execution
- Local STDIO connection between IBM Bob and the Jointly MCP server
- In-memory checkout example; no production database

## Not supported

### More than two changes

The data model, workspace matrix, interaction reasoning, and UI target exactly two changes. Jointly does not yet build or prioritize an N-change interaction graph.

### Automatic merging

`SAFE_TO_MERGE` is evidence for a human decision, not permission for Jointly to merge or push. The prototype never updates original feature branches and never applies the repair to `main` automatically.

### Universal semantic correctness

Jointly can only evaluate requirements extracted from the supplied prompts and behavior exercised by generated and existing tests. A passing passport does not prove the absence of every possible defect, unstated requirement, security issue, or production-only interaction.

### Arbitrary ecosystems

The current command runner and golden scenario are designed for TypeScript, npm, and Vitest. Python, Java, mobile, monorepo variants, services requiring containers, and remote integration environments need adapters and additional sandboxing.

### Hosted or collaborative execution

Runs are local directories. There is no hosted service, user management, shared run database, background queue, remote cache, or organization dashboard.

### GitHub pull-request integration

The prototype accepts local Git refs and can be stored on GitHub, but it does not fetch pull-request metadata, publish checks, post comments, or modify branch protection.

### Environment equivalence

Local success does not prove behavior in a production environment with different operating systems, dependency versions, databases, networks, clocks, or external services. The fixed seed and repeated interaction test address flakiness in the demonstrated behavior only.

### Malicious repositories

MCP tool inputs cannot supply arbitrary commands; execution is restricted to the commands already configured in `jointly.yaml`. Nevertheless, those repository-defined commands run local project code. Only trusted repositories should be analyzed on a developer machine.

### Prompt ambiguity

Bob records ambiguities and converts prompts to testable contracts, but it cannot recover requirements that were never stated or infer the product owner's intent with certainty. High-impact ambiguity still requires human review.

## Evidence retention

The `runs/` directory is ignored by default because it may contain large workspace copies and logs. Teams must deliberately archive the chosen backup run for submission. Logs can also contain repository paths and test output, so evidence should be reviewed before external publication.

## Appropriate claim

Jointly demonstrates that intent-aware, executable interaction testing can detect a real semantic collision that branch tests and a clean textual merge miss. It does not claim to replace code review, security review, production testing, or human ownership of a merge decision.
