# ADR-020: Include Ultracite as a First-Class Conformance Dependency

**Status:** Accepted (Supersedes [ADR-004](004-exclude-ultracite-integration.md))
**Date:** 2026-05-21

## Context

xtarterize sets up Biome, Oxlint, and Oxfmt conformance. ADR-004 excluded Ultracite because it had its own CLI and initialization flow. That boundary no longer holds: Ultracite ships importable presets for all three tools, xtarterize's own starter templates already extend them, and running both tools separately conflicts config files and creates two sources of truth.

## Decision

Install `ultracite` whenever xtarterize sets up Biome, Oxlint, or Oxfmt, and generate config files that extend or import its presets. Ultracite becomes a first-class conformance dependency rather than an optional extra.

## Rationale

- Template parity: xtarterize should produce what its own starter templates ship.
- One tool handles the full setup; running xtarterize and Ultracite separately is error-prone.
- The presets are pure config imports, so there is no separate CLI behavior to track.

## Alternatives Considered

- **Keep the ADR-004 boundary.** Rejected: two invocations, potentially conflicting configs, and templates that already assume Ultracite is present.
- **Auto-detect Ultracite and adapt only then.** Rejected: behavior would depend on order of operations, and new users would miss the best defaults.

## Consequences

- One pass configures the linting stack with the presets users expect, and new projects get good defaults without a discovery step.
- Users who do not want Ultracite must override the generated config, and rule behavior lives in `node_modules` rather than inline, so understanding a rule means reading Ultracite's source.
- Ultracite preset or rule changes can surface new lint errors in existing projects; xtarterize pins the semantic version and offers a `check` diff so users can review proposed changes.
- Migrating a legacy standalone Oxlint JSON config can leave both the old and new config files in place; detection covers both, and the old file can be deleted after verifying the new one.
- Dependency count and install time increase slightly.
