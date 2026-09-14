# ADR 023: Monorepo-Aware Task Scope System

## Status

Accepted

## Date

2026-06-29

## Context

Task resolution treated monorepos and single-package projects identically, so running `init` at a monorepo root offered package-level tasks (Vite plugin injection, tsconfig path aliases) alongside root-level tasks (CI workflows, release tooling), and vice versa. Detection already computed monorepo and workspace-root information, but no task used it.

## Decision

Each task may declare a scope: `root` (applies only at the monorepo root), `package` (applies only inside a workspace package), or `both` (the default). Resolution excludes a task whose scope contradicts the current location during monorepo runs; non-monorepo projects are never scope-filtered.

## Rationale

- Task selection becomes correct at both levels without changing the `init` flow or requiring configuration.
- The default keeps existing tasks working unchanged.

## Alternatives Considered

- **Scan all workspace packages and offer a multi-package plan.** More powerful but much more complex, and a fundamental UX change; the scope system is the simpler intermediate step.
- **A workspace-level config file mapping tasks to packages.** Adds configuration and a concept to learn; heuristics cover the common case.
- **Let plugins declare a scope.** Too coarse, since one plugin can contain both root-level and package-level tasks.

## Consequences

- `init` at the root no longer offers package-level tasks, and running inside a workspace package no longer offers root-level tasks.
- Scope is advisory: a task can still be applied directly through the API, bypassing resolution.
- xtarterize knows whether the current directory is a root or a package but does not discover workspace packages for batch application.
