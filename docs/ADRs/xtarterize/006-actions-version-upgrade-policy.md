# ADR-006: GitHub Actions Version Upgrade Policy

**Status:** Accepted  
**Date:** 2026-04-29

## Decision

xtarterize workflow templates will track **latest major versions** of third-party GitHub Actions. Upgrades are applied proactively after verifying breaking changes do not affect our usage patterns.

## Current Versions

| Action | Template Version | Rationale |
|--------|-----------------|-----------|
| `actions/checkout` | `v6` | Node 24 support, credential persistence changes |
| `actions/setup-node` | `v6` | Auto-caching limited to npm by default — we explicitly set `cache: pnpm` so unaffected |
| `peter-evans/create-pull-request` | `v8` | Requires Actions Runner v2.327.1+ — GitHub-hosted runners already compatible |
| `pnpm/action-setup` | `v4` | Latest stable, reads `packageManager` field |

## Rationale

Using outdated action versions creates security and maintenance debt. GitHub Actions often patch vulnerabilities in newer releases. Tracking latest majors ensures generated workflows remain current.

## Upgrade Process

1. Check the action's release notes for breaking changes.
2. Verify our template's usage pattern is not affected (we use standard inputs only).
3. Update templates in `packages/tasks/src/templates/workflows/`.
4. Rebuild packages and verify tests pass.

## Consequences

- Generated workflows use current, supported action versions.
- Occasional template updates required when new major versions release.
- Users get security patches and new features automatically on next `xtarterize sync`.
