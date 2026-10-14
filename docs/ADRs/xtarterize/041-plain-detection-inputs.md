# ADR 041: Plain Detection Inputs Instead of a Detection Registry

## Status

Accepted

## Date

2026-10-14

## Context

ADR 032 introduced a detection registry because the inputs that define a project profile were re-listed across detection, fingerprinting, diagnostics, and cache validation, and those lists had drifted. ADR 034 later removed the profile cache and its fingerprint. After that, each list in the registry had a single consumer: the existence detectors, bundler config extensions, monorepo markers, and lockfile names were each read in exactly one place, plus one shared lockfile list for package-manager fallback and doctor. The registry still carried typed builders, input ids, selectors, and a runtime completeness check to keep consumers in agreement, and about half of the profile's existence keys had no reader and only cost filesystem probes.

## Decision

Detection declares its inputs as plain constants next to the code that reads them, and the registry is removed. This supersedes ADR 032 and the part of ADR 034 that kept the registry.

- The profile's existence map is a hand-written type listing only the keys something reads; unread keys are dropped.
- Existence detection is one function that probes each config file or directory directly.
- Lockfile names live with package-manager detection and are shared with the doctor lockfile check, the one list that still has two consumers.
- The framework version field, which nothing read, is removed from the profile.

## Rationale

- The drift ADR 032 fixed came from several consumers re-listing the same inputs. With one consumer per list, a declaration layer adds indirection without preventing drift.
- Reading inputs where they are used makes a detector's behavior visible in one place instead of across declarations, ids, and selectors.
- Dropping unread keys removes filesystem probes from every invocation.

## Consequences

- Adding an existence key means adding a field to the profile type and a probe to the detection function; the type keeps the two in step.
- A future second consumer of an input list should share a constant from the module that owns it, as the lockfile list does.

## Alternatives

- **Keep the registry and drop only the unread keys.** Keeps the builder, id, and selector layers for lists that each have one consumer.
- **Derive the doctor lockfile check independently.** Reintroduces the duplicated lockfile list the registry originally fixed.
