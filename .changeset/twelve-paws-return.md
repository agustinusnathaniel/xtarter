---
'xtarterize': minor
---

feat: add --yes and --quiet flags to restore command

- `restore --yes` skips confirmation and selects latest backup automatically
- `restore --quiet` suppresses verbose output

feat: add --all flag to add command

- `add --all` applies all new and patch tasks without interaction

feat: expose --json flag in doctor command args

- `doctor --json` now appears in command-level help output
