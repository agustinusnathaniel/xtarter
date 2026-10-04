# ADR 002: Dependency Selection

## Status
Accepted

## Context

The CLI needs a small dependency set for process execution, prompts, template download, build, argument parsing, and logging. Dependencies that native Node.js APIs cover are replaced following the [e18e recommendations](https://e18e.dev/docs/replacements/), and remaining candidates are re-evaluated with the e18e analyze CLI when dependencies change.

## Decision

- **Process execution: tinyexec over execa.** Lighter footprint and a simpler API, sufficient for CLI needs.
- **Prompts: `@clack/prompts`.** The standard choice for interactive CLI UI and actively maintained.
- **Template download: giget over degit** (see ADR 001).
- **Build tool: tsdown over tsup.** Better TypeScript support, built on Rolldown by the Vite team.
- **CLI arguments: citty.** Type-safe argument parsing from the Nuxt team.
- **Logging: consola.** Pairs well with clack.
- **File operations: native `node:fs/promises`** instead of fs-extra.
- **ANSI styling: no dedicated library.** Output styling comes from clack and consola and honors `NO_COLOR`.
- **Keep `tinyexec`**: e18e recommends it, and it already replaced heavier alternatives.

## Consequences

- The dependency count stays small and the bundle stays lightweight.
- Shared dependency versions are centralized in the pnpm catalog (ADR 015); package-local dependencies use caret ranges.
- giget and tsdown are newer than the alternatives they replaced, so breaking changes are a maintenance risk.
- Native replacement APIs must be checked against the monorepo's engine range when it changes.
