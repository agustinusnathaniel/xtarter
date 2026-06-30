# ADR-001: Monorepo Structure with Turborepo

**Status:** Accepted  
**Date:** 2026-04-17  
**Context:** xtarterize started as a single-package CLI. As scope grew, we needed to modularize the core engine and prepare for a documentation site.

## Decision

Adopt a pnpm workspace monorepo with Turborepo for task orchestration:

```
xtarterize/
├── packages/
│   ├── core/                  # @xtarterize/core - detection, task interface, utils
│   ├── patchers/              # @xtarterize/patchers - JSON/YAML/AST patching
│   └── tasks/                 # @xtarterize/tasks - all task implementations
├── apps/
│   ├── xtarterize/            # xtarterize - conformance CLI
│   ├── create-xtarter-app/    # create-xtarter-app - project scaffolding CLI
│   └── docs/                  # @xtarterize/docs - Astro + Starlight documentation site
├── test/                      # Shared test fixtures and suites
└── turbo.json
```

## Rationale

### `packages/` vs `apps/`

- **`packages/`** - Shared libraries consumed by other workspace packages. All `@xtarterize/*` scoped libraries live here. They may be published independently.
- **`apps/`** - End-user products (CLIs, documentation sites). They consume packages but are never imported by other workspace members.

This split follows the standard Turborepo convention: libraries go in `packages/`, applications go in `apps/`. Projects like shadcn/ui or ultracite flatten everything into `packages/` because they consist entirely of libraries - we have both libraries and applications.

- `@xtarterize/core` and `@xtarterize/patchers` have clean APIs with no CLI dependencies - they can be published independently
- `apps/xtarterize` stays thin - just wiring commands to the core packages
- Turborepo provides caching and parallel execution across packages
- The structure leaves room for additional apps without restructuring

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
