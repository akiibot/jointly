# Project Documentation Context (Non-Obvious Only)

- **`BUILD_GUIDE.md` is the canonical spec** — all architecture, data models, MCP tool contracts, Bob mode config, and demo scenario details live there. Read it before asking about intent.
- **`BUILD_GUIDE.md §14`** has the authoritative TypeScript interface definitions for every core data model.
- **`BUILD_GUIDE.md §11`** has the full intended directory tree — use it as the reference when files are missing.
- **`BUILD_GUIDE.md §13`** has the complete MCP tool input/output contracts and safety rules.
- **`scenarios/checkout/`** contains the prompt files that feed the demo — `coupon-prompt.md` and `payment-retry-prompt.md` define what the two AI agents were asked to do.
- **`bob_sessions/`** is not documentation — it's evidence screenshots for hackathon submission.
- **The dashboard reads `passport.json` only** — it has no analysis logic; documentation for the analysis pipeline belongs in `packages/core/`, not `packages/dashboard/`.
- **`.bob/rules-ai-merge-investigator/`** (not `rules-agent/`) is the mode-specific rules directory for the custom Bob mode used during actual Jointly investigations.
