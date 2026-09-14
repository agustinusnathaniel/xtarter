# ADR-007: Array Replacement in JSON Merge Strategy

**Status:** Accepted
**Date:** 2026-04-29

## Decision

JSON configuration merges replace array values instead of concatenating them. Object values still merge deeply and additively.

## Rationale

The underlying merge library concatenates arrays by default, which corrupts merged configuration: a ruler list or a preset list would double on every run. Configuration arrays are usually intentional replacements, not additive collections.

## Alternatives Considered

- Concatenate arrays as the library does by default: produces duplicate entries in merged configs.

## Consequences

- Merged configuration never accumulates duplicate array entries.
- A task can only replace an array wholesale; it cannot append a single item to a user's array.
- Object merging remains deep and additive.
