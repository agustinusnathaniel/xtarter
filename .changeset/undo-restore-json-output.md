---
'xtarterize': minor
---

feat: emit machine-readable JSON from undo and restore

`undo` and `restore` now support `--json` (or `--format json`) and emit a
single machine-readable result payload on stdout instead of human logs:

- `undo --json` — `{ ok, timestamp, restored, total, files, errors }`, plus
  `removed: <count>` when the run created files that undo deleted (created-by-
  run files have no backup, so removal is the correct pre-run restore).
- `restore <file> --json` — `{ ok, filepath, restoredFrom, timestamp }`.
- Error paths stay machine-readable too: missing manifest, no backups found,
  per-file restore failures, and usage errors all emit a JSON payload with
  `ok: false` and an `error` field, and set exit code 1.
- JSON mode implies quiet and auto-confirms, so stdout carries only the JSON
  document — pipe straight into CI or scripts. The `ok` field agrees with the
  process exit code, matching the contract already shipped for `check`,
  `diff`, `doctor`, `list`, `add`, `init`, and `sync`. Every command in the
  CLI now speaks JSON.
