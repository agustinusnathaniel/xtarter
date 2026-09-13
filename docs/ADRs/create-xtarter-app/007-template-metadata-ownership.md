# ADR 007: Template Metadata Stays Hand-Maintained Across Mirrors

## Status

Accepted

## Date

2026-09-13

## Context

Template metadata lives in three hand-maintained data sources and three prose
mirrors:

- `apps/create-xtarter-app/src/templates/registry.ts` (109 lines, 5 templates)
  with `id`, `name`, `description`, `features`, `repo`, `branch`, `provider`.
- `apps/docs/src/data/template-catalog.ts` (62 lines) with `id`, `name`,
  `description`, `repo`, and a curated `stack` array of 3-4 card chips. The
  catalog feeds `TemplateGallery.astro` and `LandingHero.astro`.
- `apps/xtarter-create/package.json` `createConfig.templates` (29 lines) with
  `name`, `description`, `template`.
- Prose copies in `apps/create-xtarter-app/README.md`, the templates guide page
  (`apps/docs/src/content/docs/create-xtarter-app/guide/templates/index.mdx`),
  and the org-templates guide page
  (`apps/docs/src/content/docs/create-xtarter-app/guide/org-templates.mdx`).

The three data sources total 200 hand-maintained lines. The values diverge on
purpose. `vite-chakra` has three distinct descriptions across the registry, the
docs catalog, and the vp manifest. The registry and docs list `next-*`
templates first; the vp manifest lists `vite-*` first. The docs catalog stores
3-4 stack chips per template that are not derivable from the registry's
`features` array.

Four constraints block the obvious single-source designs:

- ADR-001: apps are never imported by other workspace members. The docs app
  imports published packages only, and `create-xtarter-app` is intentionally
  isolated, so the docs app cannot import the registry.
- Vite+ reads `createConfig.templates` from `@xtarter/create`'s published
  `package.json` and never runs a `bin`, so the manifest cannot move into
  another file. The package ships only `package.json` and `README.md` and has
  no build (ADR-005).
- The per-surface descriptions are editorial, not derived values.
- The docs app runs outside CI: `ci.yml` ignores `apps/docs/**` in
  `paths-ignore`, and `check:ci` filters out `@xtarter/docs`.

A guard was already tried and reverted. Plan 036 added
`scripts/validate-template-sync.mjs` in commit `4619fbc`, reverted the same day
in `2c8e142` (`chore: revert CI split and remove template sync guard`). It
compared only the registry and the vp manifest and never covered docs.

The production-code reduction round evaluated single-sourcing this metadata as
candidate C3 and recommends deferring it. Its sizing: a canonical store
(~60-85 lines), adapters (~27-65 lines), and a generator or check (~45-90
lines). The lightest combination adds 132 lines, so at most 68 of the 200 lines
can leave the tree, below the review's 70-80 line target. The review put the
realistic net between -40 and +15 lines. The removal would also require
unifying the intentionally divergent descriptions.

## Decision

Keep the template metadata intentionally duplicated across its mirrors. Do not
add a shared package, a build-time generator, or a CI sync guard.

- The registry, the docs catalog, and the vp manifest stay separate and
  hand-maintained.
- Descriptions, ordering, and the docs stack chips stay curated per surface.
- The deferral stands until a revisit condition below is met; this ADR is the
  durable record of the reasoning.

## Rationale

- The reduction does not pay for itself. Even the arithmetic-best combination
  removes at most 68 lines against a 70-80 line target, and the realistic
  outcome may add lines.
- Every single-source shape is blocked or expensive. A shared package breaks
  the ADR-001 and ADR-002 boundaries, a generator still has to write the vp
  manifest into `package.json`, and a docs adapter cannot import the registry.
- The divergences are deliberate. Collapsing them into one store would either
  flatten surface-specific copy (a reader-visible change) or grow adapters
  until the glue outweighs the removed lines.
- The guard mechanism was reverted within hours of landing, and the docs
  mirror sits outside CI, so a check cannot reliably cover the surface it is
  meant to protect.
- No drift incident has reached a release. The costs of a shared package or
  generator are certain; the benefit is speculative.

## Alternatives Considered

1. **Shared canonical module in a new published package, imported by the
   mirrors.** Breaks app isolation (ADR-001, ADR-002), adds a release unit and
   version coupling, and still needs generation for the static vp manifest.
   Rejected.
2. **Generate docs and vp from a canonical JSON with a check.** The canonical
   store, adapters, and generator add more maintained lines than they remove,
   committed raw size grows, and the docs half of the check cannot run reliably
   because the docs app is excluded from CI. Rejected.
3. **Generate the vp manifest only.** Small net win at best, leaves the
   registry, docs catalog, and prose mirrors untouched, and reintroduces a
   generator the owner already reverted in lighter form. Rejected.
4. **Dedupe the two code copies (registry and docs catalog) with a guard.** The
   docs app cannot legally import the registry, so the guard would compare
   copies rather than share one; it repeats the reverted mechanism and still
   ignores the vp manifest and prose copies. Rejected.

## Consequences

### Positive

- No new published package, release unit, or version coupling for template
  metadata.
- Each surface stays natural for its reader: a typed registry for the CLI, a
  plain `package.json` manifest for the vp picker, prose and cards for docs.
- `apps/docs` keeps zero workspace dependencies and stays outside the pipeline
  it is already excluded from.
- Reduction effort goes to candidates with a real line return.

### Negative

- Adding or removing a template still means editing up to six surfaces by hand,
  with nothing enforcing the set.
- Drift can survive until a release makes it visible; the response is to fix
  the surface, not to pre-emptively add a guard.
- The question will likely resurface without implementation evidence; this ADR
  is the record that answers it until the triggers below fire.

### Revisit Conditions

- A real cross-source drift incident reaches a release.
- The template count grows above ~10 (plan 036's own threshold for generating
  one source from another).
- A docs component needs data-driven rendering beyond the current cards.
- A shared published library appears for an unrelated reason, making a
  canonical store cheap.

### Related Decisions

- ADR 001 (monorepo structure): apps consume packages but are never imported by
  other workspace members.
- ADR 005 (organization templates package): `@xtarter/create` is manifest-only,
  with no code and no build.
- Plan 036 (CI template registry sync guard), commits `4619fbc` and `2c8e142`:
  the prior guard and its revert.
