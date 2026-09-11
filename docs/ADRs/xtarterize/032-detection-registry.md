# ADR 032: Detection Registry Declares Inputs and Detectors

## Status

Accepted

## Date

2026-09-10

## Context

The inputs that define a profile are re-listed across detection,
fingerprinting, diagnostics, and cache validation, and the lists have drifted:

- Lockfile names live in `detect/cache.ts`, `detect/package-manager.ts`, and
  `diagnostics.ts` (the cache list omits `bun.lock`), and monorepo markers
  appear in six places with workspace dirs `apps`/`packages`/`services` in
  `detect/monorepo.ts` but `packages`/`apps` in `detect/cache.ts`.
- `.git` at cwd is not fingerprinted (so `hasGit` can go stale), `.eslintrc.mjs`
  is recognized by doctor but not detection, `existing.tsconfig` can be true
  while `typescript` is false when only `tsconfig.jsonc` exists, and
  `isValidCacheEntry` leaves `configDirs` and `lockfile` unvalidated.

The `existing` keys are hand-written and assembled through an index cast.

## Decision

One registry module, `packages/core/src/detect/registry/index.ts` (with
`inputs`, `entries`, and `selectors` parts behind that single import path),
declares what detection reads and which detectors consume it.

- Input kinds: root file with extensions, config directory, lockfile with
  package-manager mapping, ancestor marker, cwd marker, and `package.json`.
- Entries: keyed file detectors (biome, tsconfig, renovate, commitlint, knip,
  plop, turbo, viteConfig, versionrc, gitignore, vscodeSettings), custom
  detectors (eslint, oxlint, oxfmt, githubWorkflows, changeset, agentsMd), and
  logic detectors (framework, bundler, router, styling, runtime, vitePlus,
  packageManager, monorepo, nodeVersion), each with a stable id and one input.
- The fingerprint, doctor lockfile checks, cache validation, and the `existing`
  keys derive from the registry, and `ROOT_DETECTOR_INPUTS` folds in.
- The fingerprint gains a cwd-marker kind so `.git` invalidates `hasGit`;
  `bun.lock` invalidates, `services/` is covered, and cache version is 3.
- `isValidCacheEntry` validates every field it dereferences (`configDirs`,
  `lockfile`, all fingerprint arrays), so a malformed cache recomputes instead
  of throwing.
- `.eslintrc.mjs` aligns with doctor; `typescript` and `existing.tsconfig`
  share a tsconfig declaration, and `package.json` is read once per detection.

Declarations with no consumer yet (css-modules, universal, frameworkVersion,
and the unreachable ambiguity prompt) are documented as follow-up.

Update (2026-09-11): the profile cache was removed by ADR 034. The registry
still declares the inputs and keyed detector entries that detection and
doctor consume, and the cache-specific changes above (fingerprint kinds,
cache version 3, `isValidCacheEntry`) no longer apply and are kept as the
record of this decision.

Update (2026-09-11, follow-up): the nine logic detector declarations
(framework, bundler, router, styling, runtime, vitePlus, packageManager,
monorepo, nodeVersion) were removed. Their only consumer was the fingerprint
deleted by ADR 034, so they were dead data; the Decision bullet that lists
them is superseded by this update note, with the original text kept as the
historical record, and the specs can return when a runtime consumer exists. The inputs they alone referenced (`pnpm-workspace`, `nx-config`,
`lerna-config`, `.nvmrc`) and the two with no consumer at all (the `.git` cwd
marker and the `.vscode` config dir) were removed with them. The registry now
declares the keyed file and custom detector entries plus the inputs consumed
by detection helpers (bundler config extensions, monorepo markers) and doctor
lockfile checks. This resolves the open follow-up about entries declaring
inputs with no consumer.

## Rationale

- Adding or changing a detection input touches one place; cache validation and
  the `existing` type derive from the same declarations, removing the hand
  lists and the unchecked cast.
- The missing inputs were cache staleness bugs, fixed at the source.

## Alternatives Considered

- **Two registries (inputs and detectors).** Permits the lists to drift again.
- **Constants-only consolidation.** Keeps the `existing` cast and lockfile pairs.
- **Library adoption.** Evaluated and rejected in ADR 033.

## Consequences

### Positive

- Detection changes are local to one file; stale caches from missing inputs
  become structurally harder; `existing` keys are derived without a cast.

### Negative

- Cache version 3 forces one recompute for existing users, and some registry
  entries declare inputs not yet consumed (tracked as follow-up).

### Related Decisions

- ADR 021 (profile caching, superseded by ADR 034), ADR 033 (ecosystem
  evaluation), Plan 043 Phase 5.
