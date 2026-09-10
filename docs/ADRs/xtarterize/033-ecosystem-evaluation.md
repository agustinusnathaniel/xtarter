# ADR 033: Ecosystem Evaluation for Detection and Config

## Status

Accepted

## Date

2026-09-10

## Context

Plan 043 Phase 5 asked whether xtarterize should adopt existing libraries for
config discovery, workspace discovery, and framework detection instead of
maintaining its own. The project value "Prefer the ecosystem" requires
evaluating those candidates rather than dismissing them, and the evaluation
should be recorded so it does not have to be repeated.

## Decision

Adopt no library for config discovery, workspace discovery, or framework
detection. Record the evaluation and the revisit conditions.

**Config loaders evaluated and rejected.** `cosmiconfig`, `lilconfig`, `c12`,
`rc9`, and `unconfig` each replace roughly 100 pinned lines while adding a
dependency and requiring most of their features to be disabled (source
merging, search places, TypeScript loaders) to match the profile contract.
None expresses the contract better than the pinned lines do.

**Workspace discovery evaluated and rejected.** `@manypkg`, `workspace-tools`,
`@netlify/build-info`, and `@vercel/fs-detectors` model the workspace manager
or a deployment monorepo. xtarterize needs markers for its own orchestration
tool rather than package-manager workspace semantics, and the package list has
no consumer today.

**Framework detection evaluated and rejected.** `@vercel/frameworks` is data
only; `@netlify/framework-info` is archived; `@vercel/fs-detectors` and
`@netlify/build-info` detect deployment presets rather than UI libraries.

**Revisit conditions.** Adopt `@manypkg` when workspace-package discovery gets
a consumer. Revisit `c12` if configuration grows beyond the three current
sources. No other candidate has a trigger.

## Rationale

- The maintained options solve different problems: deployment-preset detection
  and source-merging config loaders, not a profile contract over a fixed set of
  inputs.
- Detection is small and pinned; ADR 032 removes the drift that made it look
  like it needed a library.
- Adopting a loader would add dependencies and disable most of each library's
  behavior, trading maintenance for none of the benefit.

## Alternatives Considered

- **Adopt a config loader (`c12` or `cosmiconfig`).** Replaced roughly 100
  pinned lines with a dependency configured down to the same behavior.
- **Adopt a workspace detector (`@manypkg`).** No consumer for workspace
  package discovery exists today.
- **Adopt a framework detector.** The maintained options detect deployment
  presets, not UI libraries.
- **Build an abstraction so a library can be swapped in later.** Premature;
  the revisit conditions are enough and no seam is needed without a consumer.

## Consequences

### Positive

- No new third-party dependency for detection or config.
- The evaluation is recorded once, so it does not need to be repeated.
- Revisit triggers are explicit and tied to a consumer or a growth signal.

### Negative

- Detection and config stay custom code that the project maintains, and the
  chosen libraries may improve; the revisit conditions must be honored.

### Related Decisions

- ADR 032 (detection registry), Plan 043 Phase 5.
