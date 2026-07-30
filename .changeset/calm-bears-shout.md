---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
---

refactor: batch dependency installation in apply pipeline

Dependencies are now installed in groups (dev/prod) rather than one
at a time, reducing package manager subprocess calls. The apply
pipeline also collects deps across all tasks for a single batch
install before running any apply().
