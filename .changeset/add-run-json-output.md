---
'xtarterize': minor
---

feat: emit machine-readable JSON from add, init, and sync

`add`, `init`, and `sync` now support `--json` (or `--format json`) and emit a
single machine-readable result payload on stdout instead of human logs:

- `add <task-id> --json` — `{ ok, taskId, status, applied, skipped, errors }`
- `add --all --json` and `init`/`sync --yes --json` — `{ ok, applied, skipped, errors }`
- JSON mode implies quiet: stdout carries only the JSON document, so the payload
  can be piped straight into automation (CI, scripts, tooling). Human logs go to
  stderr or are suppressed, and dependency-install output is silenced.
- The `ok` field agrees with the process exit code (1 on errors), matching the
  exit-code contract introduced for `check`, `diff`, and `doctor`.
