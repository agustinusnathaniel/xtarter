# ADR 033: Ecosystem Evaluation for Detection and Config

## Status

Accepted

## Date

2026-09-10

## Context

A production-reduction phase asked whether xtarterize should adopt existing libraries for config discovery, workspace discovery, and framework detection instead of maintaining its own. The "prefer the ecosystem" value requires evaluating candidates rather than dismissing them, and recording the evaluation so it does not have to be repeated.

## Decision

Adopt no library for config discovery, workspace discovery, or framework detection, and record the revisit conditions.

- Config loaders (`cosmiconfig`, `lilconfig`, `c12`, `rc9`, `unconfig`) each replace pinned code with a dependency and require most of their features to be disabled (source merging, search places, TypeScript loaders) to match the profile contract.
- Workspace detectors (`@manypkg`, `workspace-tools`, `@netlify/build-info`, `@vercel/fs-detectors`) model the workspace manager or a deployment monorepo, not the orchestration markers xtarterize needs, and workspace package discovery has no consumer.
- Framework detectors: `@vercel/frameworks` is data only and `@netlify/framework-info` is archived; the others detect deployment presets rather than UI libraries.
- Revisit `@manypkg` when workspace package discovery gets a consumer, and `c12` if configuration grows beyond the current sources. No other candidate has a trigger.

## Rationale

- The maintained options solve different problems: deployment-preset detection and source-merging config loaders, not a profile contract over a fixed set of inputs.
- Detection is small, and the detection registry (ADR 032) removed the drift that made it look like it needed a library.
- A loader would add dependencies while disabling most of its behavior.

## Alternatives Considered

- **Adopt a config loader.** A dependency configured down to the same behavior.
- **Adopt a workspace detector.** No consumer for workspace package discovery exists.
- **Adopt a framework detector.** The maintained options detect deployment presets, not UI libraries.
- **Build a swap-in abstraction.** Premature without a consumer; the revisit conditions are enough.

## Consequences

### Positive

- No new third-party dependency, the evaluation is recorded once, and the revisit triggers are explicit.

### Negative

- Detection and config stay custom code the project maintains, and the libraries it passed over may improve; the revisit conditions must be honored.
