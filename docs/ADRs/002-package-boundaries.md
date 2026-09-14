# ADR-002: Package Boundaries and Dependency Graph

**Status:** Accepted  
**Date:** 2026-04-17

## Context

The monorepo separates library packages from applications, and the packages need a dependency direction that prevents import cycles.

## Decision

Enforce a strict one-way dependency graph: the CLI app depends on core and tasks; tasks depends on core and patchers; core and patchers depend on nothing else in the workspace. No package may import from a package it does not declare, and circular dependencies are forbidden.

The task interface lives in core rather than tasks because core's orchestration code imports it while tasks must import core's project detection; placing it in tasks would create a core-to-tasks-to-core cycle.

## Rationale

- Core is the foundational layer, patchers handle file transformation mechanics, tasks combine both, and the CLI is the thinnest layer of user interaction and orchestration.
- A single direction keeps the graph acyclic and lets packages build and publish independently.

## Consequences

- Workspace packages need explicit resolution configuration in builds and tests when imported across boundaries.
- Adding a task touches only the tasks package, no other package.
