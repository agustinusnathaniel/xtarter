---
"xtarterize": minor
---

adds a new `doctor` command with human and JSON diagnostics output, expands machine-readable JSON output support across auditing commands, and refactors CLI command internals to share preflight/runtime/spinner utilities.

Core detection and reliability were improved by making backup index writes atomic/resilient and by improving monorepo detection for workspace package directories. Task internals were also refactored by splitting large factory helpers into smaller modules while preserving behavior.
