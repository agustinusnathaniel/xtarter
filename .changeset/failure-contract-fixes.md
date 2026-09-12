---
'@xtarterize/core': patch
'xtarterize': patch
---

Fix the CLI failure contract and keep manifest errors typed

- `runCliProgram` now returns `A | undefined` instead of promising a value it
  cannot produce on failure or interrupt, and `query` returns early when extra
  task statuses are interrupted instead of crashing.
- `writeRunManifest` wraps raw filesystem failures in `BackupError` with the
  original message, and `liftBackup` no longer casts arbitrary rejections.
- `detectProjectWithAmbiguity` maps rejections to `TaskError` instead of
  leaking them as defects.
