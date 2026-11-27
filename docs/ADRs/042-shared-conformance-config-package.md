# ADR-042: Publish the Conformance Rules as a Shared Config Package

**Status:** Accepted
**Date:** 2026-11-17

## Context

xtarterize writes Biome, Oxlint, and Oxfmt configs that extend Ultracite's presets and add a small xtarter layer on top. That layer exists only in the generated files. Some users want the same conformance as a dependency they import once and never edit.

## Decision

Publish `@xtarter/config`, a plain-data package with one entry per tool and per preset:

- Biome, Oxlint, and Oxfmt entries, each layered the way Ultracite's presets are: a core layer plus framework and router layers (one for each framework and router xtarterize detects). Consumers extend core and add the layers that match their stack.
- Each xtarter layer extends the matching Ultracite preset. The package depends on Ultracite directly, so one release of `@xtarter/config` always means one rule set. The tools themselves are optional peer dependencies.
- Only portable settings belong in the package; anything that depends on a project's layout, such as file includes or VCS integration, stays in the consumer's own config.
- Entries are published as package subpath exports, not through Biome's manifest. A manifest export key makes the package invalid for Node, which loads the Oxlint and Oxfmt entries, so any future GritQL plugins, which need the manifest, go in a separate package.
- The package owns the xtarter layer. The tasks package imports it to render every config it writes on top of Ultracite, so the rules have one definition. The package itself depends on nothing in the workspace (ADR-002).
- Versioning: a new or stricter rule is a minor release, a relaxed rule or a fix is a patch, and removing an entry or raising a peer's major version is a major release.

## Rationale

- One definition of the rules keeps xtarterize's output and the shared package from drifting apart.
- Layered entries mirror Ultracite, so users already know how to compose them, and the package avoids one entry for every framework and router combination.
- Depending on Ultracite instead of copying it follows "prefer the ecosystem" and keeps ADR-020's preset choice.
- A prototype confirmed that nested extends resolve from inside the shared package under pnpm's strict layout, so consumers do not need Ultracite at their project root.

## Consequences

- Direct users get new error-level rules in minor releases, so each such release names those rules in its changelog. An Ultracite upgrade inside the package counts as a rule change.
- Oxlint's JSON config format cannot extend npm packages, so the shared Oxlint entry works only from a TypeScript or JavaScript Oxlint config.
- An Oxlint entry whose Ultracite preset loads JS plugins also exports them, because Knip reads JS plugins only from the root config. Those layers stay opt-in for direct users; xtarterize adds only `landmines`, to Oxlint configs it creates (ADR-046).

## Alternatives

- **Copy Ultracite's rules into the package.** Rejected: it doubles the maintenance and forks a dependency xtarterize already standardised on.
- **Publish one package per tool.** Rejected for now: three packages to version for one rule set.
- **Make Ultracite a peer dependency.** Rejected: the consumer's Ultracite version would change the rules without an `@xtarter/config` release.
