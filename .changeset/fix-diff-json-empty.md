---
'xtarterize': patch
---

`diff --json` (and `init`/`sync` `--dry-run --json`) now emit a machine-readable payload even when there are no pending changes — previously a fully conformant project printed human text like "No pending changes" on stdout (or nothing at all), breaking the JSON contract for CI consumers. The payload's `ok` field agrees with the exit code, and dry-run failures are surfaced as `summary.failures`.
