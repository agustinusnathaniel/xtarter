---
'xtarterize': patch
---

Correct CLI option handling and quiet-mode output

- Flags must be passed after the command (`xtarterize check --json`). Entry-level flags such as `xtarterize --json check` are rejected by the invocation guard instead of being silently dropped.
- Removed the dead `check --verbose` flag; `check` always reports the tool and configuration diagnostics it runs.
- `list --quiet` no longer prints the timing block, and `init --compose --quiet` no longer prints plan banners.
