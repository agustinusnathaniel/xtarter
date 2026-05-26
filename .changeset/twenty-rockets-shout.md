---
"@xtarterize/core": patch
"xtarterize": patch
---

refactor: add per-command timing instrumentation

Adds timing measurement for each phase of command execution (detection,
resolution, apply) with per-task breakdown available via the new `--timing`
global flag. Timing summary is displayed at the end of every command in
terminal output, and included in JSON output for `--json` mode.
