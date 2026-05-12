---
'@xtarterize/core': minor
'xtarterize': minor
---

enhance diff/dry-run output with hunks, stats, and semantic JSON diffing

- Add `DiffHunk`, `ChangeStats`, `SemanticEntry` types and optional fields on `FileDiff`
- Add `computeChangeStats`, `computeUnifiedHunks`, `computeSemanticJsonDiff`, `enhanceDiff` core utilities
- Add `--format` flag to `init`, `sync`, `diff`, and `add` commands (`terminal` | `json`)
- Terminal output now shows `+N -M` change stats per file, `@@` hunk headers, and key-level semantic diffs for JSON files
- JSON output includes structured hunks, stats, and semantic data for AI-agent consumption
