---
'@xtarterize/core': patch
'xtarterize': patch
---

Remove test-only diff exports and route session reporting through `reportOutcome`

- `@xtarterize/core` no longer exports the test-only `computeChangeStats` and `computeUnifiedHunks`; diff stats and hunks are reached through `enhanceDiff`, which derives both from a single pass.
- CLI command outcomes are reported through `CommandSession.reportOutcome`; messages and exit codes are unchanged.
