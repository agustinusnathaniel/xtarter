# ADR-014: Vite Plus Migration

**Status:** Accepted
**Date:** 2026-05-07

## Context

The monorepo previously used a split toolchain: Vite for development, Vitest for testing, a separate bundler for libraries, Biome for linting and formatting, and Turborepo for task orchestration. Each tool needed its own config file and dependency declarations.

## Decision

Migrate the monorepo toolchain to Vite Plus, a unified CLI that wraps Vite, Vitest, Rolldown, and related tooling. Build, test, and pack run through it, and its check command combines formatting, linting, and type checking.

Retain Turborepo for task orchestration and Biome for linting and formatting, because Vite Plus's Oxlint and Oxfmt were not mature enough to replace Biome's project-specific rules. Do not redirect Vite and Vitest to their Vite Plus equivalents at the workspace level: packages that need Vite Plus declare it directly, and the documentation site keeps standard Vite because its Astro toolchain needs plugin hooks that Rolldown does not yet implement.

For generated projects, Vite+ detection selects the Vite Plus linting and formatting stack as the default, while a project that already uses Biome keeps it. This supersedes ADR-003's position that Vite+ detection must not gate lint tooling or scripts; type checking remains ungated.

## Rationale

A single dependency for build, test, and pack reduces version drift and dependency count, and one check command simplifies CI. Retaining Turborepo keeps a well-tested task graph.

## Alternatives Considered

- Keep the split toolchain: more config files, more dependencies, and separate CI steps with no single check command.
- Replace Biome with Oxlint and Oxfmt now: those tools were less mature than Biome's project-specific rules.
- Replace Turborepo with Vite Task: the Vite Task graph was new and might not model the existing dependency graph correctly.
- Redirect Vite and Vitest at the workspace level: breaks the Astro documentation site.

## Consequences

- Fewer config files overall, but per-package config is larger.
- The toolchain depends on a young, fast-moving CLI.
- The development workflow requires the Vite Plus CLI to be available.
- The documentation site stays on standard Vite and Vitest, so the repository runs two toolchains side by side.
