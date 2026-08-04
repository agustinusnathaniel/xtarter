---
'xtarterize': minor
---

feat: add CI-friendly exit codes to check, diff, and doctor commands

- check: exits 1 when the project has pending changes or failing diagnostics (was always 0)
- diff: exits 1 when at least one change is pending, mirroring `git diff --exit-code`
- doctor: exits 1 when at least one diagnostic fails
- init/sync --dry-run and other mutating commands: exit 1 on dry-run task failures
