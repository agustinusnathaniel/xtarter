# ADR-006: GitHub Actions Version Upgrade Policy

**Status:** Accepted
**Date:** 2026-04-29

## Decision

Workflow templates track the latest major versions of third-party GitHub Actions. Upgrades are applied proactively once release notes confirm that no breaking change affects the templates' usage patterns, which use standard inputs only.

## Rationale

Outdated action versions create security and maintenance debt because GitHub often patches vulnerabilities in newer releases. Tracking latest majors keeps generated workflows current and delivers security fixes to users on their next sync.

## Consequences

- Generated workflows use current, supported action versions.
- Templates need occasional updates when new majors ship.
- A major release that breaks template behavior can require a coordinated update across templates.
