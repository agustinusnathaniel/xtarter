---
"xtarterize": patch
---

refactor(diff-display): use unified diff format for all dry-run output

Consolidates three separate renderers (full-file, hunk, semantic) into a single unified diff format (`renderHunkDiff`) for consistent git-style patch output across new, modified, and JSON files in `--dryRun` and `diff` commands.
