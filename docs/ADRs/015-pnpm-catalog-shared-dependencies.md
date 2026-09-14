# ADR-015: pnpm Catalog for Shared Dependencies

**Status:** Accepted  
**Date:** 2026-05-07

## Context

Multiple workspace packages often depend on the same libraries. Without centralized version pinning, each package declares its own range, which causes version drift across packages, makes dependency updates repetitive, and produces inconsistent resolved versions in the lockfile. pnpm's [catalog](https://pnpm.io/catalogs) feature defines shared version ranges once in `pnpm-workspace.yaml`.

## Decision

Use the pnpm workspace catalog for every dependency shared by two or more packages. Package-local dependencies keep literal version ranges. Consuming packages reference a cataloged dependency with the `"catalog:"` protocol.

## Rationale

- Single source of truth: version ranges are defined once, and one bump updates every consumer on install.
- No additional tooling: the catalog is pnpm-native and works with standard commands.
- Consistency: two packages cannot resolve different minor versions of the same dependency.

## Alternatives Considered

- **Root devDependencies only:** covers devDependencies but not runtime dependencies, and does not enforce consistency.
- **Root `pnpm.overrides`:** forces one version everywhere but silently overrides declared semver ranges.
- **Manual version coordination:** error-prone and does not scale.

## Consequences

- Adding a shared dependency requires two edits: a catalog entry and a `"catalog:"` reference in each consumer.
- Package-local dependencies can still use literal versions, so the convention is not enforced by tooling.
- Catalog versions should be reviewed during dependency update cycles.
