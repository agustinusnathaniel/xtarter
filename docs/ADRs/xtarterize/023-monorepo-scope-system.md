# ADR 023: Monorepo-Aware Task Scope System

## Status

Accepted

## Date

2026-06-29

## Context

xtarterize's task resolution pipeline treats all projects identically
regardless of whether they are monorepos or single-package projects.

When running `xtarterize init` on a monorepo root, tasks designed for
individual packages (such as Vite plugin injection or tsconfig path
aliases) are offered alongside root-level tasks (CI/CD workflows,
release tooling, editor configuration). This creates a poor experience:

- `rollup-plugin-visualizer` is offered for monorepo roots that use
  Vite only for build orchestration, not for a browser app.
- `vite-plugin-checker` is offered at root level where it doesn't
  belong.
- tsconfig path aliases (`@/* → ./src/*`) conflict with project
  references at the monorepo root.
- There is no way to distinguish "this task applies at the root
  level" from "this task applies inside workspace packages."

The detection pipeline already computes `profile.monorepo` and
`profile.workspaceRoot`, but no task uses these fields to change
its behavior. They are populated but dead data.

## Decision

Introduce a `TaskScope` type that each task can optionally declare:

```typescript
type TaskScope = "root" | "package" | "both";
```

### Scope semantics

- **`root`**: The task applies only at the monorepo root. Examples:
  CI/CD workflows, release tooling, turbo.json, renovate config,
  editor settings, npmrc, root gitignore, root package.json scripts.
- **`package`**: The task applies only inside a workspace package.
  Examples: per-package tsconfig path aliases, Vite plugin injection.
- **`both`** (default): The task applies everywhere. This is the
  backward-compatible default - tasks without an explicit scope
  continue to work as before.

### Resolution logic

The scope filter is applied in `resolveTasks()`, after the existing
`applicable()` filter:

```
if (profile.monorepo) {
  if (profile.workspaceRoot && scope === 'package') → exclude
  if (!profile.workspaceRoot && scope === 'root') → exclude
}
```

For non-monorepo projects (`profile.monorepo === false`), no scope
filtering occurs - all tasks pass through regardless of their
declared scope.

### Runtime detection fix

In addition to the scope system, the runtime detection order in
`detectRuntime()` is corrected: `framework === 'node'` is now
checked before bundler-based detection (`vite`, `webpack`, `rspack`).
Previously, a monorepo root with `vite-plus` (a Node.js build
orchestrator) was incorrectly classified as `runtime: 'browser'`
because the bundler check fired first. This also serves as a
belt-and-suspenders guard for Vite plugin tasks, which additionally
require `runtime !== 'node'` in their `applicable()` filter.

## Consequences

### Positive

- **Correct task selection in monorepos.** Running `init` at the
  root no longer offers package-level tasks, and running inside a
  workspace package no longer offers root-level tasks.
- **Backward compatible.** Existing tasks and external plugins
  without `scope` continue to work - they default to `'both'`.
- **Small surface area.** The entire feature adds ~50 lines of
  meaningful code across types, resolution, and detection.
- **Dual protection.** Vite plugin tasks are protected by both
  the scope system (`scope: 'package'`) and the runtime check
  (`runtime !== 'node'`).

### Negative

- **Scope is advisory, not enforced.** Tasks that declare
  `scope: 'root'` can still be applied inside a workspace package
  if called directly via the API, bypassing `resolveTasks()`.
- **No workspace package discovery yet.** The scope system knows
  whether the current directory is a root or a package, but does
  not discover or iterate over workspace packages for batch
  application. This can be added in a follow-up.

### Migration

No migration needed. The `scope` field is optional and defaults
to `'both'`. All 27 built-in tasks have been assigned an explicit
scope where appropriate (13 root, 3 package, 1 explicit both).

## Alternatives Considered

### Multi-package scanning

Instead of scope-based filtering, xtarterize could scan all
workspace packages, build per-package profiles, and offer a
multi-package plan. This is more powerful but significantly more
complex and would change the fundamental UX of `init`. The scope
system is a simpler, non-breaking intermediate step.

### Workspace-level config

A `.xtarterizerc` file at the monorepo root could declare which
tasks apply to which packages. This adds configuration overhead
and an additional concept for users to learn. The scope system
uses heuristics that cover the common case without configuration.

### Plugin-level scope

Rather than assigning scope to individual tasks, plugins could
declare their intended level. This is too coarse - a single plugin
may contain both root-level and package-level tasks.
