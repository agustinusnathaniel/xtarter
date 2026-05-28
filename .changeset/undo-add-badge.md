---
"@xtarterize/core": minor
"xtarterize": minor
---

feat: add undo command, interactive add, and conformance badge

- `xtarterize undo` reverts the last run by restoring all backed-up files in one command
- `xtarterize add` without a task ID shows a grouped multi-select menu for interactive task selection
- `xtarterize check --badge <path>` generates an SVG conformance badge
- Add RunManifest type and writeRunManifest/readRunManifest/listAllBackups to core backup module
