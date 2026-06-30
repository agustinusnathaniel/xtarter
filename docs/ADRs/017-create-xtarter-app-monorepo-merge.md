# ADR-017: Merge create-xtarter-app into xtarterize Monorepo

**Status:** Accepted
**Date:** 2026-05-11

## Context

`create-xtarter-app` is a CLI tool that scaffolds new JavaScript/TypeScript projects from 5 curated templates (Next.js, Vite, each with Chakra UI, Tailwind, or Hero UI variants). It was developed as a standalone repository (`agustinusnathaniel/create-xtarter-app`), published independently on npm, and versioned with `commit-and-tag-version`.

`xtarterize` is a complementary tool that layers production-grade conformance configurations (linting, type checking, CI, editor settings) onto existing projects. The README documents a two-step workflow: scaffold with `create-xtarter-app`, then configure with `xtarterize`.

Both tools share the same author, target audience, and npm organization. Maintaining them in separate repos creates coordination overhead: duplicate CI, divergent tooling (ultracite vs biome, commit-and-tag-version vs changesets), and manual cross-repo documentation.

## Decision

Merge `create-xtarter-app` into the `xtarterize` pnpm monorepo as `apps/create-xtarter-app/`, a sibling to `apps/xtarterize/` and `apps/docs/`, with the following design decisions:

### Independent versioning

`create-xtarter-app` is registered in `.changeset/config.json` but excluded from the `fixed[]` array (which couples `@xtarterize/core`, `@xtarterize/patchers`, `@xtarterize/tasks`, and `xtarterize`). It receives changeset bumps only when a changeset explicitly targets it. Tags are namespaced (`create-xtarter-app@1.2.0` vs `xtarterize@1.7.0`). Same CI pipeline, fully independent release cadences.

### Zero source code changes

The `@/*` path alias is preserved via `apps/create-xtarter-app/tsconfig.json` with `compilerOptions.paths`. All source files transfer verbatim from the original repo, requiring no import rewriting.

### Tooling alignment

- `ultracite` is dropped; root `biome.json` handles formatting and linting.
- `commit-and-tag-version` is replaced by changesets (single toolchain for the whole monorepo).
- `@biomejs/biome`, `turbo`, and `commit-and-tag-version` are removed from the app's devDependencies.
- Dependencies `@clack/prompts`, `citty`, `giget`, `tinyglobby`, `consola`, and `tinyexec` are added to the pnpm workspace catalog.

### Structure

```
apps/create-xtarter-app/
  src/             # verbatim copy from original repo
  package.json     # new, using catalog: refs
  tsconfig.json    # new, composite project reference
  vite.config.ts   # new, vp pack + vitest config
```

### Node engine relaxation

`engines.node` relaxed from `^24.11.x` to `>=24` to match the monorepo.

## Rationale

- **Single CI pipeline** - one release workflow, one test suite, one set of dependency updates.
- **Unified toolchain** - biome + changesets + vp across all packages.
- **Canonical docs** - the xtarterize documentation site already describes the scaffold-then-configure workflow; the merged structure eliminates doc drift.
- **Simpler npm publishing** - both packages publish from the same GitHub Actions workflow with provenance support.
- **No breaking changes** - the npm package name, CLI binary name, and API surface are unchanged.

## Alternatives Considered

### Keep as separate repo, link from docs

- Simpler to execute, but perpetuates tooling divergence and coordination overhead.
- Does not solve the trusted publisher migration question (eventually one repo must own publishing).

### Merge into packages/ instead of apps/

- `packages/` is for libraries consumed by other workspace packages.
- `create-xtarter-app` is an end-user CLI, not a library - `apps/` is correct.

### Make create-xtarter-app part of the fixed[] array

- Would force synchronous version bumps with xtarterize core packages.
- Rejected because scaffolding and conformance configuration have different release rhythms.

## Consequences

- `create-xtarter-app` inherits the monorepo's `node >=24` engine requirement.
- The old GitHub repo (`agustinusnathaniel/create-xtarter-app`) remains active until the first successful npm publish from the monorepo confirms the trusted publisher migration.
- npm trusted publisher must be configured for `agustinusnathaniel/xtarterize` (workflow: `release.yml`) before the first publish.
- Changesets become the versioning mechanism; manual version bumps via workflow_dispatch are still supported.
- The `create-xtarter-app` binary (`apps/create-xtarter-app/dist/cli.mjs`) is included in `pnpm build:cli` (which excludes only `@xtarterize/docs`).
