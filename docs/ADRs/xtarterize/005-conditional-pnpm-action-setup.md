# ADR-005: Conditional pnpm/action-setup in CI Workflows

**Status:** Accepted  
**Date:** 2026-04-29

## Decision

Conditionally include `pnpm/action-setup` in generated GitHub Actions workflows **only when the target project already uses pnpm**. Do not force pnpm adoption or add the action for npm/yarn projects.

## Rationale

xtarterize configures projects; it does not impose package manager choices. Teams committed to npm or yarn should not find pnpm-specific actions injected into their CI workflows.

However, `actions/setup-node` only enables pnpm caching — it does not install pnpm itself. While pnpm is pre-installed on GitHub-hosted runners, the version varies as GitHub updates images. `pnpm/action-setup` ensures reproducible pnpm versions and reads from the `packageManager` field if present.

## Alternatives Considered

### Force pnpm universally

- Too opinionated — would create friction for npm/yarn teams.
- Changes the scope of xtarterize from "project configurator" to "package manager evangelist."

### Always include pnpm/action-setup regardless of package manager

- Would be a no-op or error for npm/yarn projects.
- Adds unnecessary noise to non-pnpm workflows.

### Omit pnpm/action-setup entirely

- Rely on GitHub runner's pre-installed pnpm version.
- Version drift risk — runner images update pnpm independently of the project's needs.

## Consequences

- pnpm projects get reproducible, version-pinned pnpm installation in CI.
- npm/yarn projects are unaffected — no extra action steps injected.
- xtarterize remains package-manager agnostic while supporting each tool's best practices.
