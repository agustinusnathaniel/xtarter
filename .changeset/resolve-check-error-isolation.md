---
'xtarterize': patch
---

`check`, `list`, `diff`, `init`, and `sync` no longer crash when a single task's `check()` throws: the task degrades to `conflict` (with a warning naming the task and error) and the rest of the audit still resolves. Previously one failing task check aborted the entire command with an unhandled `TaskError` and no output.
