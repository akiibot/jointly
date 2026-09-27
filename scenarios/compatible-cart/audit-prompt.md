# Change B: cart audit recording

Add an audited cart wrapper that records every successful item addition as `added:<sku>:<quantity>`. Return defensive copies of audit entries. Do not add pricing or discount behavior.
