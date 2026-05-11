# ADR-003: Vite+ Detection Without Tooling Assumptions

**Status:** Accepted  
**Date:** 2026-04-17

## Decision

Detect Vite+ usage (`vite-plus` or `vp` in dependencies) and expose it as `vitePlus: boolean` on `ProjectProfile`, but **do not** assume Vite+ replaces other tooling.

### What we do NOT do

- Do NOT gate Biome for Vite+ projects — many Vite+ projects use Biome alongside or instead of Oxlint
- Do NOT gate vite-plugin-checker for Vite+ projects — type checking needs are project-specific
- Do NOT force `vp` commands in package.json scripts or CI workflows — the project owner chooses their tooling

### What we DO

- Detect `vite-plus` or `vp` in dependencies
- Expose `vitePlus` on `ProjectProfile` for tasks that genuinely need to know
- Leave room for future tasks (e.g., `vp migrate`) to use this signal

## Rationale

Vite+ bundles Oxlint, Oxfmt, Vitest, and Rolldown — but it does not prevent a project from using Biome, ESLint, or other tools alongside it. The scanned real projects show Vite+ projects that still use Biome for linting/formatting. Assuming otherwise would make xtarterize destructive to existing configurations.

The correct approach is: detect, expose, let individual tasks decide if they need to adapt — and most tasks don't need to.

## Alternatives Considered

### Gate linting tasks for Vite+ projects
- Would incorrectly skip Biome for projects that want it
- Makes xtarterize opinionated about tooling choices that belong to the project owner

### Force `vp` commands in scripts
- `vp` covers dev/build/test/check/preview — everything else (lint, format, typecheck, release) should still use underlying tools
- Even for dev/build, projects may prefer explicit commands for clarity

## Consequences

- `vitePlus` is available on `ProjectProfile` but most tasks ignore it — which is correct
- Future tasks can use this signal when it's genuinely relevant (e.g., configuring `vite.config.ts` for Vite+'s `defineConfig` import path)
