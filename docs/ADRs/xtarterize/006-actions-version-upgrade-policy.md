# ADR-006: GitHub Actions Version Upgrade Policy

**Status:** Accepted  
**Date:** 2026-04-29  
**Last updated:** 2026-07-01

## Decision

xtarterize workflow templates will track **latest major versions** of third-party GitHub Actions. Upgrades are applied proactively after verifying breaking changes do not affect our usage patterns.

## Current Versions

| Action                            | Template Version | Rationale                                                                              |
| --------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `actions/checkout`                | `v7`             | Latest major                                                                           |
| `actions/setup-node`              | `v6`             | Still used for non-pnpm projects (npm, yarn, bun fallback)                             |
| `pnpm/setup`                      | `v1`             | Unified action replacing `pnpm/action-setup` + `setup-node`; reads `packageManager`; handles runtime + caching |
| `actions/cache`                   | `v6`             | Used for Turborepo cache persistence in release workflow                               |
| `peter-evans/create-pull-request` | `v8`             | Requires Actions Runner v2.327.1+ - GitHub-hosted runners already compatible           |

## Rationale

Using outdated action versions creates security and maintenance debt. GitHub Actions often patch vulnerabilities in newer releases. Tracking latest majors ensures generated workflows remain current.

## Upgrade Process

1. Check the action's release notes for breaking changes.
2. Verify our template's usage pattern is not affected (we use standard inputs only).
3. Update `packages/tasks/src/templates/workflows/` (the `versions.ts` constant or the template files directly).
4. Rebuild packages and verify tests pass.

## Consequences

- Generated workflows use current, supported action versions.
- Occasional template updates required when new major versions release.
- Users get security patches and new features automatically on next `xtarterize sync`.
