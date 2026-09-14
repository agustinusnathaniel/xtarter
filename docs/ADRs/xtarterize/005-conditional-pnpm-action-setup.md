# ADR-005: Conditional pnpm/setup in CI Workflows

**Status:** Accepted
**Date:** 2026-04-29

## Decision

Generated GitHub Actions workflows include the pnpm setup action only when the target project already uses pnpm. npm and yarn projects never get pnpm-specific setup, and xtarterize never pushes a package manager onto a project.

For pnpm projects, use the unified setup action. It replaces the former pairing of a pnpm-only action with a runtime setup action by installing pnpm and the runtime and caching the pnpm store in one step.

## Rationale

xtarterize configures projects; it does not impose package manager choices, and npm or yarn teams should not find pnpm actions injected into their CI. Relying on the runner's preinstalled pnpm would let the CI version drift from the project's own.

## Alternatives Considered

- Force pnpm universally: too opinionated, creates friction, and turns xtarterize from a configurator into a package manager advocate.
- Always include pnpm setup: a no-op or error for npm and yarn projects, and noise in their workflows.
- Omit pnpm setup entirely: version drift when runner images update pnpm independently.
- Keep the older two-action pairing: two actions where one now suffices, without the unified caching.

## Consequences

- pnpm projects get a pinned pnpm version, unified runtime setup, and store caching.
- npm and yarn projects are untouched.
- Workflow templates branch on package manager, which adds a small maintenance surface.
