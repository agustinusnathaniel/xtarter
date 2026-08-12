---
'xtarterize': patch
---

`add` now supports `--include-conflicts`, mirroring `init`/`sync`. `add --all` and `add <task-id>` can force-apply conflicting tasks, and `add --all` warns when conflicting tasks were skipped so CI runs aren't silently incomplete.
