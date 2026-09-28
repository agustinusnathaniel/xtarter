# ADR-005: Conditional pnpm/setup in CI Workflows

**Status:** Accepted
**Date:** 2026-04-29 (amended 2026-09-28)

## Decision

Generated GitHub Actions workflows include the pnpm setup action only when the target project already uses pnpm. npm and yarn projects never get pnpm-specific setup, and xtarterize never pushes a package manager onto a project.

For pnpm projects, use `pnpm/setup@v3`. It replaces the former pairing of a pnpm-only action with a runtime setup action by installing pnpm and the runtime and caching the pnpm store in one step. It also runs `pnpm install` itself, so the templates do not emit a separate install step for pnpm; the other package managers still get one from `createSetupSteps`. The action is configured with `require-lockfile: 'true'`, so a pnpm project with no lockfile fails CI instead of letting pnpm resolve from the registry and write one.

`pnpm/setup` requires pnpm v11 or newer, so the `quality/package-engines` task writes a `>=11` floor for pnpm rather than the older `>=9`.

## Rationale

xtarterize configures projects; it does not impose package manager choices, and npm or yarn teams should not find pnpm actions injected into their CI. Relying on the runner's preinstalled pnpm would let the CI version drift from the project's own.

The setup action covers install, runtime, and store cache, so a separate install step is duplicate work. `require-lockfile` closes the gap where a missing lockfile passes CI silently; pnpm in CI already refuses to update an existing lockfile, so this only changes behavior for the missing-lockfile case. The `>=11` floor matches what the action can actually install.

## Alternatives Considered

- Force pnpm universally: too opinionated, creates friction, and turns xtarterize from a configurator into a package manager advocate.
- Always include pnpm setup: a no-op or error for npm and yarn projects, and noise in their workflows.
- Omit pnpm setup entirely: version drift when runner images update pnpm independently.
- Keep the older two-action pairing: two actions where one now suffices, without the unified caching.
- Keep a separate `pnpm install` step: runs the install twice for pnpm projects, since the setup action already does it.
- Pass a `runtime` input instead of relying on detection: redundant for pnpm projects that declare `devEngines.runtime` or ship a `.node-version`, `.nvmrc`, or `.tool-versions` file, all of which the action reads on its own.

## Consequences

- pnpm projects get a pinned pnpm version, unified runtime setup, store caching, and a single install.
- A pnpm project with no lockfile fails CI rather than resolving dependencies at build time.
- npm and yarn projects are untouched.
- Workflow templates branch on package manager, which adds a small maintenance surface.
- Generated pnpm CI requires the project to already be on pnpm v11 or newer.
