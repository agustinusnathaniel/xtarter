---
'@xtarterize/core': patch
---

Consolidate the diagnostics and IO surface behind deep modules

- `runDiagnostics(cwd, options)` is the single diagnostics entry point; the per-group runners are internal and `doctor`/`check` output is unchanged.
- Added `collectDependencyVersions(pkg)` and `isJsonFile(filepath)` for the shared dependency-record and JSON-file checks.
- `enhanceDiff` derives stats and hunks from one diff pass.
- Removed the unused `ExecutePlanOptions`, `PlanTasksOptions`, `UnknownFlag`, `MonorepoDetection`, `TagColor`, `InvocationValidationOptions`, and `CliArgDefinition` exports, the dead `readJson`/`detectFramework` re-exports, and the unused `externalTasks` parameter of `resolveProjectTasks`.
