---
'@xtarterize/core': patch
---

Drop the `effect` dependency in favor of plain async/await

- `FileSystemError`, `BackupError`, and `TaskError` remain plain `Error` subclasses with the same fields and names.
- Task status checks and apply dry-runs run through `mapWithConcurrency` (limit 8), a local bounded-parallel helper that preserves input order.
- Observable CLI output and generated files are unchanged.
