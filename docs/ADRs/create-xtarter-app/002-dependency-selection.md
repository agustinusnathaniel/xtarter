# ADR 002: Dependency Selection

## Status
Accepted

## Context

The CLI needs a small dependency set for process execution, prompts, template download, build, argument parsing, and logging.

## Decisions

- **Process execution: tinyexec over execa.** Lighter footprint and a simpler API, sufficient for CLI needs.
- **Prompts: `@clack/prompts`.** The standard choice for interactive CLI UI and actively maintained.
- **Template download: giget over degit** (see ADR 001).
- **Build tool: tsdown over tsup.** Better TypeScript support, built on Rolldown by the Vite team.
- **CLI arguments: citty.** Type-safe argument parsing from the Nuxt team.
- **Logging: consola.** Pairs well with clack.
- **File operations: native `node:fs/promises`.** fs-extra was replaced by the native API (ADR 004).

## Consequences

- The dependency count stays small and the bundle stays lightweight.
- Shared dependency versions are centralized in the pnpm catalog (ADR 015); package-local dependencies use caret ranges.
- giget and tsdown are newer than the alternatives they replaced, so breaking changes are a maintenance risk.
