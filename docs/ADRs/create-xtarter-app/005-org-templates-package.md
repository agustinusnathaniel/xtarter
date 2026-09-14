# ADR 005: Organization Templates Package (`@xtarter/create`)

## Status

Accepted

## Context

`create-xtarter-app` is a full-featured scaffolding CLI with interactive prompts, dependency installation, and git initialization. Vite+ supports organization templates through `@org/create` packages: `vp create @xtarter` would resolve `@xtarter/create`, read its `createConfig.templates` manifest, and open an interactive template picker. Vite+ users should be able to discover the same templates without leaving `vp create`, while `create-xtarter-app` keeps serving users who want the full experience.

## Decision

Publish `@xtarter/create` as a thin, manifest-only package. Its `createConfig.templates` manifest points at the existing GitHub template repositories, and no build or runtime code is shipped.

## Rationale

- Minimal maintenance: one package manifest and one README, no code, no build.
- Templates keep a single source of truth in their GitHub repositories.
- `create-xtarter-app` continues unmodified, so there is no breaking change.
- If the manifest were missing, Vite+ would fall back to the package binary, so there is no silent failure path.
- `@xtarter/create` versions independently from the fixed `@xtarterize/*` group.

## Alternatives Considered

- **Bundle templates into the package:** decouples from upstream repositories but requires constant sync and loses Vite+'s post-processing (Vite+ has no template engine).
- **Only maintain `create-xtarter-app`:** loses discovery by Vite+ users.

## Consequences

- The `@xtarter` npm organization must be registered to publish.
- Template additions and removals must stay in sync between `create-xtarter-app` and `@xtarter/create`.
- Vite+ users get a scaffold-only experience with no dependency install, git init, or CI cleanup; direct them to `create-xtarter-app` for the full workflow.
