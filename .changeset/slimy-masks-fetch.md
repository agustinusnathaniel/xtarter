---
"@xtarterize/core": patch
"@xtarterize/tasks": patch
"xtarterize": patch
---

fix: make profile cache write resilient to concurrent cleanup

The `writeProfileCache` function now re-creates the cache directory before
rename, preventing ENOENT errors when parallel processes clean up the
`.xtarterize/cache` directory between steps.

