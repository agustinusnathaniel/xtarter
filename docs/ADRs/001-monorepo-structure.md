# ADR-001: Monorepo Structure with Turborepo

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** xtarterize started as a single-package CLI. As scope grew, we needed to modularize the core engine and prepare for a documentation site.

## Decision

Adopt a pnpm workspace monorepo with Turborepo for task orchestration:

```
xtarterize/
├── packages/
│   ├── core/          # @xtarterize/core — detection, task interface, utils
│   ├── patchers/      # @xtarterize/patchers — JSON/YAML/AST patching
│   └── tasks/         # @xtarterize/tasks — all task implementations
├── apps/
│   └── cli/           # xtarterize — CLI entry point
├── test/              # Shared test fixtures and suites
└── turbo.json
```

## Rationale

- `@xtarterize/core` and `@xtarterize/patchers` have clean APIs with no CLI dependencies — they can be published independently later
- `apps/xtarterize` stays thin — just wiring commands to the core packages
- Turborepo provides caching and parallel execution across packages
- The structure leaves room for `apps/docs` without restructuring

## Alternatives Considered

### Single package
- Simpler but prevents independent publishing of core utilities
- No clean boundary between CLI concerns and library concerns

### Nx
- Heavier, more opinionated than we need
- Turborepo is simpler and aligns with the Vite ecosystem

### Bun workspace
- Would lock us into Bun runtime
- pnpm is the ecosystem standard for monorepos

## Consequences

- Build pipeline is more complex (4 packages vs 1)
- Each package needs its own tsconfig, tsup config
- Tests import from workspace packages rather than relative paths
- Vitest requires explicit alias configuration (no `resolveTsConfigPaths` in vitest 4.x)