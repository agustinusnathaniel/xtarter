---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
---

perf: faster dependency installation when running `xtarterize sync` or `xtarterize add`

Dependencies are now installed in batches instead of one at a time,
significantly reducing the number of package manager calls during
task application.
