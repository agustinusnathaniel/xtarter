# ADR-001: Monorepo Structure with Turborepo

**Status:** Accepted  
**Date:** 2026-04-17

## Context

xtarterize started as a single-package CLI. As scope grew, the project needed to modularize the core engine and prepare for a documentation site.

## Decision

Adopt a pnpm workspace monorepo with Turborepo for task orchestration. Shared libraries live in workspace packages; end-user products (CLIs, documentation sites) live in workspace applications.

## Rationale

- Library packages are consumed by other workspace members and may be published independently; applications consume packages but are never imported by other workspace members.
- This follows the standard Turborepo convention and leaves room for additional apps without restructuring.
- Clean library APIs keep the CLI thin, while Turborepo provides caching and parallel execution.

## Alternatives Considered

- **Single package:** simpler, but prevents independent publishing and blurs CLI and library concerns.
- **Nx:** heavier and more opinionated than needed.
- **Bun workspace:** would lock the project into the Bun runtime.

## Consequences

- The build pipeline is more complex than a single package, and each package needs its own build and TypeScript configuration.
- Tests import from workspace packages rather than relative paths, which requires explicit test alias configuration.
