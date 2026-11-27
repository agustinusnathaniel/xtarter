# ADR 007: Template Metadata Stays Hand-Maintained Across Mirrors

## Status

Accepted

## Date

2026-09-13

## Context

`create-xtarter-app` is the full scaffolding CLI, with prompts, dependency install, and git setup. Vite+ users discover the same templates through `vp create @xtarter`, which resolves `@xtarter/create` and reads its `createConfig.templates` manifest from published package metadata. Vite+ has no template engine and scaffolds straight from the template repositories, so `@xtarter/create` is a manifest-only package with no code or build, pointing at the same GitHub repositories and versioned on its own. This record absorbs ADR 005, which created it.

Template metadata therefore lives in three hand-maintained data sources (the CLI's typed registry, the docs template catalog, and the Vite+ manifest), plus prose copies in the CLI README and two docs guides. The values diverge on purpose: descriptions are curated per surface, ordering differs between the CLI and the Vite+ picker, and the docs catalog carries stack chips the registry cannot derive. A sync guard was already tried and reverted.

## Decision

Keep the template metadata intentionally duplicated across its mirrors. Do not add a shared package, a build-time generator, or a CI sync guard. The registry, docs catalog, Vite+ manifest, and prose copies stay hand-maintained.

## Rationale

- Single-sourcing does not pay for itself: a canonical store, adapters, and a generator would add more maintained code than they remove.
- Every single-source shape is blocked: a shared package breaks app isolation, a generator must still write published package metadata for Vite+, and a docs adapter cannot import the registry.
- The divergences are deliberate, and a check cannot be reliable: the prior guard was reverted and the docs app sits outside CI.

## Alternatives Considered

- **Maintain only `create-xtarter-app`.** Vite+ users would not discover the templates.
- **Bundle the templates into `@xtarter/create`.** Needs constant syncing with the template repositories and loses Vite+'s post-processing.
- **Shared canonical package.** Breaks app isolation and adds a release unit; still needs generation for the static Vite+ manifest.
- **Generator with a sync check.** Adds more maintained code than it removes, and the docs half cannot run reliably outside CI.
- **Generate the Vite+ manifest only.** Small net win at best; leaves the other mirrors untouched.
- **Guard over the registry and docs catalog.** The docs app cannot import the registry, so the guard would compare copies and ignore the remaining mirrors.

## Consequences

- Adding or removing a template means editing every surface by hand, and drift can survive until a release makes it visible.
- Vite+ users get scaffolding only, with no dependency install or git setup; the docs point them to `create-xtarter-app` for the full flow.

## Revisit Conditions

- A cross-source drift incident reaches a release.
- The template set grows enough that hand-syncing becomes error-prone.
- A docs component needs data-driven rendering beyond the current cards.
- A shared published library appears for an unrelated reason, making a canonical store cheap.
