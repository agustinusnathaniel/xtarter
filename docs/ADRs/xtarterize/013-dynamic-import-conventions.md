# ADR-013: Dynamic Import Conventions

**Status:** Accepted
**Date:** 2026-05-02

## Context

The codebase mixes static imports with dynamic `await import()`, and contributors occasionally ask why one is used over the other.

## Decision

Use dynamic `await import()` in exactly two situations; use static imports everywhere else.

1. Lazy loading of an expensive or rarely used dependency at the point of use, so it is not loaded and parsed when that code path does not execute.
2. Built-in modules used only inside a conditional branch, which keeps the top-level import list focused on universally used dependencies.

Dynamic import is not a tool for breaking dependency cycles: the package graph is acyclic, and a cycle is fixed by restructuring, not by hiding it. Workspace packages are imported statically unless there is a documented performance or bundling reason.

## Rationale

Static imports are easier to analyze for tree-shaking, IDE navigation, and dependency graphs. Dynamic imports add async overhead and make control flow harder to follow, so they need a measurable startup or memory benefit.

## Alternatives Considered

- Import everything statically: pays the startup cost of heavy dependencies on code paths that never use them.

## Consequences

- Reviewers flag dynamic imports that do not fit the two cases.
- Existing violations are refactored to static imports when touched.
- The two valid cases require judgment at review time, so the convention is enforced manually.
