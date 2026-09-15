---
'@xtarterize/tasks': patch
---

Generate workflows with pnpm/setup@v2

Newly applied CI and release workflows now install pnpm with `pnpm/setup@v2`
instead of `v1`. Existing projects pick up the bump on the shared setup step
when re-running `apply`; workflow behavior is otherwise unchanged.
