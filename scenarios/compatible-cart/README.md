# Compatible cart scenario

This validation fixture models two independently authored changes from one Git base:

- Change A adds integer percentage discounts to `Cart`.
- Change B adds an `AuditedCart` wrapper without changing pricing.

The regression harness constructs actual base, change-A, change-B, and combined commits in a unique temporary repository. It verifies both feature commits have the same parent, merges them without textual conflict, and runs the preserved base test plus the combined interaction test.

This is a known-answer CI fixture. It is not runtime investigation input, model-generated evidence, or proof of broader compatibility beyond this scenario.
