# ADR-014: Vite Plus Migration

**Status:** Accepted  
**Date:** 2026-05-07

## Context

The project previously used a split toolchain: Vite for dev server, Vitest for testing, tsdown for library bundling, Biome for linting/formatting, and Turborepo for monorepo task orchestration. Each tool required its own config file (`vite.config.ts`, `vitest.config.ts`, `tsdown.config.ts`, `biome.json`) and separate dependency declarations.

[Vite Plus](https://viteplus.dev) (`vp`) is a unified toolchain by VoidZero that consolidates these into a single CLI. It wraps Vite, Vitest, Rolldown, tsdown, Oxlint, Oxfmt, and Vite Task under one `vp` command surface.

## Decision

Migrate the monorepo toolchain to Vite Plus. This replaces:

| Before | After | Command |
|--------|-------|---------|
| `tsdown` (library bundler) | `vp pack` | `vp pack` / `vp pack --watch` |
| `vitest` (test runner) | `vp test` | `vp test` / `vp test run` |
| `vitest` imports in tests | `vite-plus/test` | `import { describe } from 'vite-plus/test'` |
| Root `vite` + `vitest` deps | `vite-plus` | Single dependency |
| Per-package `tsdown` deps | `vite-plus` | Single devDependency |

Turborepo and Biome are **retained** — Turborepo for task orchestration (the monorepo build graph) and Biome for linting/formatting (Vite Plus's Oxlint/Oxfmt are not yet mature enough to replace Biome's project-specific rules).

### What changed in each config

- **`vite.config.ts`** — Now the single source of truth for build (`pack`), test, lint, format, and staged hooks config
- **`tsdown.config.ts`** — Deleted. Options inlined into `pack` block in `vite.config.ts`
- **`vitest.config.ts`** — Retained for test-specific overrides (globals), merges root `vite.config.ts`
- **`package.json` scripts** — `build` changed from `tsdown` to `vp pack`, `test` changed from `vitest run` to `vp test run`

### Root `vite.config.ts` removal

The root `tsdown.config.ts` referenced a non-existent `src/cli/index.ts` (no `src/` directory at root). The `pack` block was removed from root `vite.config.ts` — the root package is `private: true` and has no build script. Per-package configs handle their own builds.

### No workspace-level vite/vitest overrides

`vp migrate` recommends adding workspace-level overrides to redirect `vite` and `vitest` to their Vite Plus equivalents:

```yaml
# NOT used — breaks Astro in apps/docs
overrides:
  vite: npm:@voidzero-dev/vite-plus-core@latest
  vitest: npm:@voidzero-dev/vite-plus-test@latest
```

This was rejected because Rolldown (Vite Plus's bundler) does not yet implement all Vite plugin hooks that Astro depends on (`generateBundle`). The docs site (`apps/docs`) uses Astro + Starlight, which requires real Vite.

Instead, each workspace package that needs Vite Plus declares it as a direct devDependency (`"vite-plus": "catalog:"`). The root and docs packages use standard Vite/Vitest. No overrides are needed.

## Rationale

- **Single dependency** for build/test/pack reduces version drift and dependency count
- **`vp check`** combines format + lint + typecheck in one command, simplifying CI
- **`vp pack`** replaces tsdown with a unified interface while preserving the same Rolldown-powered bundler under the hood
- **`vp test`** runs Vitest through Vite Plus, removing the standalone `vitest` dependency from root
- **Config consolidation** reduces the number of config files per package (tsdown.config.ts deleted)

## Alternatives Considered

### Keep split tooling
- More config files, more dependencies, more version coordination
- No single `check` command — CI needs separate lint, format, typecheck steps

### Full migration to Oxlint/Oxfmt (drop Biome)
- Oxlint is still alpha; Biome's project-specific lint rules and auto-fix are more mature
- Can be done incrementally later via Vite Plus config

### Replace Turborepo with Vite Task
- Turborepo's dependency graph (`^build`, `typecheck` depending on `^build`) is well-tested
- Vite Task is new and may not model the same DAG correctly
- Retained Turborepo for now; can revisit when Vite Task stabilizes

## Consequences

- Per-package `vite.config.ts` now contains both Vite and pack config — slightly larger files but fewer total config files
- `vitest` imports in test files remain as `vitest` (resolved through Vite Plus alias) — no test file changes needed
- The `vp` CLI must be available globally or via `npx vp` for development
- Root `vite.config.ts` no longer has a `pack` block (dead config was removed)
- Build output is identical — same Rolldown bundler, same output format
