# ADR-017: Merge create-xtarter-app into xtarterize Monorepo

**Status:** Accepted
**Date:** 2026-05-11

## Context

`create-xtarter-app` scaffolds projects from curated Next.js and Vite templates. It was developed as a standalone repository, published independently, and versioned with `commit-and-tag-version`. `xtarterize` layers conformance configuration onto existing projects, and the README documents a two-step workflow: scaffold first, then configure. Both tools share an author, audience, and npm organization, so separate repositories duplicate CI, diverge tooling (ultracite vs biome, commit-and-tag-version vs changesets), and require manual cross-repo documentation.

## Decision

Merge `create-xtarter-app` into the `xtarterize` pnpm monorepo as an application, alongside the existing CLI and docs site. It is released independently through changesets: excluded from the fixed release group, bumped only when a changeset targets it, and published under a namespaced tag. The monorepo uses biome and changesets throughout, and the app inherits its Node engine requirement. The package name, CLI binary name, and API surface are unchanged.

## Rationale

- One CI pipeline, one release workflow, and one dependency update cycle replace two of each.
- A unified toolchain removes divergent formatting, linting, and versioning tools.
- Merging eliminates documentation drift between the two tools.
- Publishing both packages from one workflow supports provenance.

## Alternatives Considered

- **Keep a separate repository:** simpler to execute, but perpetuates tooling divergence and splits trusted-publisher ownership.
- **Merge as a library package:** library packages are consumed by other workspace members; this is an end-user CLI.
- **Include it in the fixed release group:** scaffolding and conformance work have different release rhythms.

## Consequences

- The app inherits the monorepo's Node engine requirement.
- The old GitHub repository stays active until the first successful npm publish from the monorepo confirms the trusted publisher migration.
- Changesets become the release mechanism; manual version bumps remain possible.
