---
'xtarterize': minor
---

feat: persist task selection in `.xtarterizerc`

`.xtarterizerc` (and the `"xtarterize"` key in `package.json`) now accepts
`skip` and `only` arrays alongside `plugins`, giving every run a persisted
default filter:

- `skip` — task IDs always excluded from runs.
- `only` — when non-empty, restricts runs to these task IDs; an empty or
  absent list means no restriction.

CLI flags keep precedence over the config: `--only` replaces the config
`only` list, while `--skip` extends the config `skip` list. A task listed
in both `skip` and `only` is excluded (skip wins). Entries are trimmed,
and empty or non-string entries are dropped. When a selection references
unknown task IDs, sync/init print a warning — suppressed in quiet and JSON
mode so stdout stays machine-readable.
