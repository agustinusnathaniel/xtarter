---
'xtarterize': patch
---

fix: `undo` now removes files that a run created instead of failing with "No backup found"

Previously `undo` only restored files that had a backup, so files newly created by
`init`/`add`/`sync` (e.g. `biome.json`) were left behind and the command exited 1.
Now a manifest entry without a backup is treated as a file created by the run and
is deleted to restore the pre-run state.
