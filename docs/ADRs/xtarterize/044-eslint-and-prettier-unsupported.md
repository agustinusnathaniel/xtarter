# ADR-044: ESLint and Prettier Are Unsupported

**Status:** Proposed
**Date:** 2026-11-17

## Context

xtarterize configures only Biome and the Oxc tools (Oxlint, Oxfmt). It never sets up ESLint or Prettier, but it still reacts to them in scattered ways. Finding ESLint quietly turns off several lint tasks. Diagnostics warn separately about Biome alongside ESLint, Biome alongside Prettier, and legacy ESLint config files. Prettier is not detected at all, so Biome can be added on top of it. Users get no single answer to whether these tools are supported.

## Decision

- ESLint and Prettier are not supported, and xtarterize says so once. When either is present, the run and the doctor report the tool found, that xtarterize configures only Biome and the Oxc tools, and which kind of task, linting or formatting, it skips.
- Detection stays. If ESLint is present, the linting tasks are skipped. If Prettier is present, the formatting tasks are skipped. Biome does both, so either tool skips it.
- The single message replaces the per-tool conflict and legacy-config diagnostics.
- Existing scripts that run ESLint or Prettier still count as covering lint or format, so xtarterize never overwrites them.
- `@xtarter/config` publishes no ESLint or Prettier entries, even though Ultracite offers them.
- xtarterize does not migrate ESLint or Prettier configs. That could be added later as its own decision.

## Rationale

- Removing detection outright would install a second linter or formatter beside the existing one, which is worse than doing nothing.
- One explicit message replaces three partial warnings and quiet skips, so users know why tasks did not run.
- Skipping lint and format tasks separately still lets a project that uses Prettier with no linter adopt Oxlint.

## Consequences

- Projects on ESLint or Prettier get no lint or format conformance from xtarterize until they move off those tools themselves.
- Prettier now has to be detected from its config files and dependency, the way ESLint already is.
- ESLint no longer blocks Oxfmt, and Prettier now blocks Biome and Oxfmt: each tool blocks only the kind of task it overlaps.
- Oxlint rule names that carry ESLint plugin prefixes are Oxlint's own namespaces. They are unaffected by this decision.

## Alternatives

- **Migrate ESLint and Prettier configs automatically.** Deferred: the ecosystem has migration tools, but deleting a project's tooling needs its own design and undo story.
- **Ignore ESLint and Prettier entirely.** Rejected: projects would end up with two linters or two formatters.
