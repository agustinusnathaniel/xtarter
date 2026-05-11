# ADR-004: Exclude Ultracite Integration

**Status:** Accepted  
**Date:** 2026-04-29

## Decision

Do not include Ultracite as an xtarterize-managed conformance task.

xtarterize will continue to provide Biome setup and general lint/format scripts, but it will not install Ultracite, patch Biome config to extend Ultracite presets, or wrap Ultracite command behavior.

## Rationale

Ultracite already provides its own CLI and opinionated initialization flow. Wrapping it inside xtarterize would duplicate that tool's responsibilities and increase maintenance cost without adding enough value.

The appropriate boundary is:

- xtarterize owns broadly applicable project conformance setup.
- Ultracite owns its own opinionated Biome preset workflow.
- Developers who want Ultracite can run its CLI directly after or instead of xtarterize.

## Alternatives Considered

### Include `lint/ultracite` as a first-class task

- Would require tracking Ultracite's config model and CLI behavior.
- Creates two sources of truth for Ultracite setup.
- Adds complexity to `sync`, `diff`, and package script generation.

### Auto-detect Ultracite and adapt all lint scripts

- Useful for existing projects, but still couples xtarterize behavior to Ultracite internals.
- Risks surprising users by changing script semantics based on an optional external tool.

### Recommend Ultracite in documentation only

- Keeps the boundary clear.
- Lets Ultracite remain responsible for its own setup path.
- Avoids turning xtarterize into a wrapper around another conformance CLI.

## Consequences

- xtarterize's linting support remains simpler and easier to reason about.
- Users who want Ultracite must run the Ultracite CLI explicitly.
- Existing Ultracite-specific code should be removed or kept unregistered only as a temporary migration artifact.
- Tests and documentation should not treat Ultracite as part of xtarterize's v1 conformance contract.
