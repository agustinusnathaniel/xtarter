# ADR-014: Vite Plus Toolchain

**Status:** Accepted
**Date:** 2026-05-07

## Context

The monorepo used a split toolchain: Vite for development, Vitest for tests, a separate library bundler, Biome for linting and formatting, and Turborepo for orchestration, each with its own config and dependencies. Generated projects that use Vite+ faced a related choice of lint and format stack.

## Decision

- Build, test, and pack the monorepo through Vite Plus, which wraps Vite, Vitest, and Rolldown.
- Keep Turborepo for orchestration and Biome for the repository's own linting and formatting.
- Packages declare Vite Plus directly instead of redirecting Vite and Vitest at the workspace level. The docs site stays on standard Vite, because Astro needs plugin hooks Rolldown does not yet implement.
- In generated projects, detecting Vite+ selects Oxlint and Oxfmt as the default lint and format stack, while a project that already uses Biome keeps it. This reverses ADR-003, which kept Vite+ detection from gating lint tooling; type checking stays ungated.

## Rationale

- One dependency for build, test, and pack reduces version drift, and Turborepo keeps a well-tested task graph.
- Vite+ projects run Vite+'s own lint and format commands, so the default stack is the one those commands run (ADR-045).

## Alternatives Considered

- **Replace Turborepo with Vite Task.** Its task graph was new and might not model the existing dependencies correctly.
- **Replace Biome with Oxlint and Oxfmt in this repository.** They were not mature enough for the project's own rules at the time.
- **Redirect Vite and Vitest at the workspace level.** Breaks the Astro docs site.

## Consequences

- The toolchain depends on a young, fast-moving CLI.
- The repository runs two toolchains side by side: Vite Plus for packages and standard Vite for the docs site.
