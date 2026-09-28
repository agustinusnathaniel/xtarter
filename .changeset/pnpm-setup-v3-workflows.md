---
'@xtarterize/tasks': patch
---

Install dependencies once in generated pnpm CI

`pnpm/setup` already runs `pnpm install`, so generated CI, release, and
auto-update workflows installed dependencies twice for pnpm projects. There is
now a single install, and the setup action moves to `v3`.

Generated pnpm CI also fails when a project has no `pnpm-lock.yaml`, instead of
resolving from the registry and writing one on the fly.

Re-run `sync` to update an existing project.
