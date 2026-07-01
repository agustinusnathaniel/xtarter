# ADR-005: Conditional pnpm/setup in CI Workflows

**Status:** Accepted  
**Date:** 2026-04-29  
**Last updated:** 2026-07-01

## Decision

Conditionally include `pnpm/setup` in generated GitHub Actions workflows **only when the target project already uses pnpm**. Do not force pnpm adoption or add the action for npm/yarn projects.

## Rationale

xtarterize configures projects; it does not impose package manager choices. Teams committed to npm or yarn should not find pnpm-specific actions injected into their CI workflows.

`pnpm/setup@v1` is a unified action that handles both pnpm (and its runtime — Node.js, Bun, Deno) installation in a single step. It replaces `actions/setup-node` entirely for pnpm projects: it reads the `packageManager` field, installs the correct pnpm version, sets up the runtime, and handles caching of the pnpm store directly via `cache: true`.

Prior to June 2026, the ecosystem used two separate actions: `pnpm/action-setup` (for pnpm only) alongside `actions/setup-node` (for runtime and caching). The release of `pnpm/setup` unified these into a single step. xtarterize migrated accordingly.

## Alternatives Considered

### Force pnpm universally

- Too opinionated - would create friction for npm/yarn teams.
- Changes the scope of xtarterize from "project configurator" to "package manager evangelist."

### Always include pnpm/setup regardless of package manager

- Would be a no-op or error for npm/yarn projects.
- Adds unnecessary noise to non-pnpm workflows.

### Omit pnpm/setup entirely

- Rely on GitHub runner's pre-installed pnpm version.
- Version drift risk - runner images update pnpm independently of the project's needs.

### Stay on pnpm/action-setup + actions/setup-node

- Two actions where one now suffices.
- Misses caching improvements in `pnpm/setup`.

## Consequences

- pnpm projects get reproducible, version-pinned pnpm installation in CI, unified runtime setup, and direct store caching.
- npm/yarn projects are unaffected - no extra action steps injected.
- xtarterize remains package-manager agnostic while supporting each tool's best practices.
