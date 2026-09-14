# ADR 032: Detection Registry Declares Inputs and Detectors

## Status

Accepted

## Date

2026-09-10

## Context

The inputs that define a project profile were re-listed across detection, fingerprinting, diagnostics, and cache validation, and the lists had drifted: lockfile names and monorepo markers appeared in several places with inconsistent workspace directories, some inputs were recognized by one consumer but not another, and cache validation left fields unchecked. The profile existence keys were hand-written and assembled through an index cast.

## Decision

One registry declares what detection reads and which detectors consume it.

- Input kinds: root file with extensions, config directory, lockfile with package-manager mapping, ancestor marker, and the package manifest.
- Detector entries have stable ids and bind to their declared input(s): keyed file detectors and custom detectors, plus the inputs consumed by detection helpers and doctor lockfile checks.
- The profile existence keys derive from the registry instead of a hand-written list and an unchecked cast.

The registry holds only inputs with a runtime consumer. The profile cache and its fingerprint were removed by ADR 034, and the logic detector declarations whose only consumer was that fingerprint were removed with it.

## Rationale

- Adding or changing a detection input touches one declaration.
- The missing inputs were inconsistencies between consumers, fixed at the source.

## Alternatives Considered

- **Two registries (inputs and detectors).** Permits the lists to drift again.
- **Constants-only consolidation.** Keeps the hand-written existence keys and duplicated lockfile pairs.
- **Library adoption.** Evaluated and rejected in ADR 033.

## Consequences

### Positive

- Detection changes are local to one declaration, and the profile existence keys derive without a cast.

### Negative

- The registry covers only inputs with a current consumer, so detection code can still read inputs outside it and new inputs join only when a consumer needs them.
