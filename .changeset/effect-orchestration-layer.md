---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Re-adopt Effect as the CLI orchestration layer

Internal architecture change recorded in ADR 036. `@xtarterize/core` and
`@xtarterize/tasks` now return `Effect` values, and the `xtarterize` CLI runs
each command program through a single Effect runtime edge.

- Failures use typed tagged errors (`TaskError`, `DepsInstallError`,
  `ProcessError`, `BackupError`, `FileSystemError`) with the same message text
  as before.
- Effectful edges are services: `ProcessRunner`, `DepsInstaller`, and the
  app-level `Prompter`.
- The task contract is Effect-only; synchronous and Promise-returning spec
  functions are normalized at the `defineTask` seam.
- `effect` is pinned to `4.0.0-rc.113` and bundled into the CLI, so published
  `dependencies` no longer include it.
- Observable CLI behavior and generated files are unchanged.
