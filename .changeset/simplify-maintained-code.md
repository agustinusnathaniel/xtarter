---
'@xtarterize/core': patch
'@xtarterize/patchers': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Remove dead exports and unused internal APIs from the maintained packages

- Removed the `applyTasks` wrapper from core, so callers compose `planTasks` and `executePlan` directly, and consolidated the duplicate CLI invocation guard into `createInvocationGuard`.
- Removed the YAML patcher (`mergeYaml`/`parseYaml`) and the filesystem `injectVitePlugin`; `injectVitePluginIntoCode` is the single in-memory entry point.
- Dropped the unused `js-yaml` dependencies from the patchers package and the bundled CLI, so the `xtarterize` binary no longer inlines them.
- CLI behavior and generated configurations are unchanged.
