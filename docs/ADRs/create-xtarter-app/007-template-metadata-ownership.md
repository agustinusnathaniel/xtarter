# ADR 007: Template Metadata Stays Hand-Maintained Across Mirrors

## Status

Accepted

## Date

2026-09-13

## Context

Template metadata lives in three hand-maintained data sources (the CLI's typed registry, the docs template catalog, and the Vite+ organization manifest), plus prose copies in the CLI README and two docs guides. The values diverge on purpose: descriptions are curated per surface, ordering differs between the CLI and the Vite+ picker, and the docs catalog carries stack chips the registry cannot derive. Single-sourcing is blocked by app isolation (ADR-001, ADR-002), by Vite+ reading its manifest from published package metadata (ADR-005), and by the docs app running outside CI; a sync guard was already tried and reverted.

## Decision

Keep the template metadata intentionally duplicated across its mirrors. Do not add a shared package, a build-time generator, or a CI sync guard. The registry, docs catalog, Vite+ manifest, and prose copies stay hand-maintained.

## Rationale

- Single-sourcing does not pay for itself: a canonical store, adapters, and a generator would add more maintained code than they remove.
- Every single-source shape is blocked: a shared package breaks app boundaries, a generator must still write published package metadata for Vite+, and a docs adapter cannot import the registry.
- The divergences are deliberate, and a check cannot be reliable: the prior guard was reverted and the docs app sits outside CI.

## Alternatives Considered

- **Shared canonical package.** Breaks app isolation and adds a release unit; still needs generation for the static Vite+ manifest.
- **Generator with a sync check.** Adds more maintained code than it removes, and the docs half cannot run reliably outside CI.
- **Generate the Vite+ manifest only.** Small net win at best; leaves the other mirrors untouched.
- **Guard over the registry and docs catalog.** The docs app cannot import the registry, so the guard would compare copies and ignore the remaining mirrors.

## Consequences

- No new published package, release unit, or version coupling.
- Each surface stays natural for its reader: registry for the CLI, package metadata for the Vite+ picker, prose and cards for docs.
- Adding or removing a template means editing every surface by hand, and drift can survive until a release makes it visible.

## Revisit Conditions

- A cross-source drift incident reaches a release.
- The template set grows enough that hand-syncing becomes error-prone.
- A docs component needs data-driven rendering beyond the current cards.
- A shared published library appears for an unrelated reason, making a canonical store cheap.
