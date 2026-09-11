# ADR-002: Package Boundaries and Dependency Graph

**Status:** Accepted  
**Date:** 2026-04-17

## Decision

Strict one-way dependency graph:

```
apps/xtarterize
  → @xtarterize/core
  → @xtarterize/tasks
        → @xtarterize/core
        → @xtarterize/patchers
```

No package may import from a package it doesn't depend on. No circular dependencies.

### Package responsibilities

| Package                        | Owns                                                                                                                                            | Depends on                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `@xtarterize/core`             | `ProjectProfile`, `detectProject()`, `Task` interface, `resolveTasks()`, `planTasks()`, `executePlan()`, `backup.ts`, all utils (`fs`, `pkg`, `diff`, `logger`) | npm: `@clack/prompts`, `citty`, `consola`, `diff`, `effect`, `json5`, `nypm`, `pathe`, `picocolors`, `pkg-types`, `tinyexec` |
| `@xtarterize/patchers`         | `mergeJson()`, `parseJsonc()`, `patchJson()`, `injectVitePluginIntoCode()`                                                                      | npm: `defu`, `json5`, `jsonc-parser`, `magicast`, `pathe`               |
| `@xtarterize/tasks`            | All 19 task implementations, all template renderers                                                                                             | `@xtarterize/core`, `@xtarterize/patchers`, npm: `nypm`                 |
| `xtarterize` (apps/xtarterize) | CLI commands, UI components, citty entry point                                                                                                  | `@xtarterize/core`, `@xtarterize/tasks`, npm: `@clack/prompts`, `citty` |

The YAML patcher (`mergeYaml`, `parseYaml`) and the filesystem `injectVitePlugin` wrapper were retired after this ADR: workflows are emitted as text templates, and Vite config patching is content-level via `injectVitePluginIntoCode`.

### Circular dependency resolution

The `Task` interface (`_base.ts`) lives in `@xtarterize/core` - not in `@xtarterize/tasks` - because:

- `core/apply.ts` and `core/resolve.ts` need to import `Task`
- `tasks/` needs to import `ProjectProfile` from `core/detect.ts`
- Putting `_base.ts` in `tasks/` would create a cycle: `core → tasks → core`

## Rationale

- `@xtarterize/core` is the foundational layer - everything else builds on it
- `@xtarterize/patchers` is orthogonal - it handles file transformation mechanics
- `@xtarterize/tasks` combines both to produce concrete task implementations
- `apps/xtarterize` is the thinnest layer - just user interaction and orchestration

## Consequences

- `tsup` in `@xtarterize/tasks` and `apps/xtarterize` needs `noExternal: [/^@xtarterize\//]` to bundle workspace deps
- Tests at root level need vitest aliases to resolve workspace packages
- Adding a new task means touching `@xtarterize/tasks` only - no other package changes
