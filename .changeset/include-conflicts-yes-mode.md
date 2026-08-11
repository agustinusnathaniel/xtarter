---
'xtarterize': patch
---

fix: `sync`/`init` honor `--include-conflicts` in non-interactive (`--yes`/quiet) mode

`--include-conflicts` was passed through to `applyTasks` in the interactive apply-all and
select paths, but silently dropped in the `--yes`/quiet path — so
`xtarterize sync --yes --include-conflicts` (or `init --yes --include-conflicts`) skipped
every conflicting task despite the flag. Non-interactive mode is exactly where the flag
matters (CI, scripts), so conflicting tasks are now applied when it is set, consistent
with the interactive paths.
