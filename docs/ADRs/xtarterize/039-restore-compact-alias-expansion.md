# ADR 039: Restore Compact Alias Expansion for Task Query Scoring

## Status

Accepted

## Date

2026-09-14

## Context

ADR 038 (commit 207a311) removed the 92-line `SYNONYM_MAP` and its transitive,
cross-group expansion from `packages/core/src/inquiry/`; tokenization,
stemming, fuzzy and prefix matching, substring matching, the coverage bonus,
and signal weights were untouched. It was accepted on five documented queries
and was right that the old map was a hand-maintained catalog whose
full-strength synonym scores could outrank literal matches.

A 33-query battery over the built-in catalog then measured the regression
`[measured]`: results dropped from 191 to 83, mean top-1 relevance fell from
0.783 to 0.580, `typing` returned zero results, `updates` fell from 0.925 to
0.210, `husky` fell from 10 results to 1, and `code` inverted its top result
from `editor/vscode` to `codegen/plop`. The recall loss came from dropping
expansion entirely, not from those defects; this is not a revert of ADR 038.

## Decision

Restore query expansion in a compact, precision-preserving shape inspired by
the search implementation in Meta's MIT-licensed Astryx design system
(`facebook/astryx`, `packages/cli/api/search/search.mjs`).

- `packages/core/src/inquiry/aliases.ts` holds 18 pipe-delimited, hand-written
  alias groups (45 lines). Expansion is bidirectional and sibling-closed within
  one group: every term maps to the other terms of its group, aliases are never
  expanded again, and there is no cross-group transitive closure. A term in two
  groups gets the union of both groups, not their closure.
- The scorer matches each query token directly and then through its aliases.
  Alias-derived tier scores are multiplied by 0.85, so a direct hit outranks an
  alias hit at the same tier; a direct exact match still short-circuits at 1.0.
- Alias-derived substring matches require meaningful containment: the shorter
  side is at least 4 characters and at least half the longer side's length.
- A multi-word query that exactly matches an authored keyword is promoted to a
  reserved 0.85, above alias-stacked token paths; single-word and non-exact
  phrases are not promoted. This ports astryx's reserved phrase tier and fixes
  `auto update`, `npm scripts`, `node version`, and `build cache`.
- Four tasks gained an alias through the existing `searchMeta.keywords` field:
  `typing` on `ts/strict`, `versioning` on `release/versionrc`, `updates` on
  `deps/renovate`, and `hooks` on `release/git-hooks` (4 lines total).
- Match tiers, weights, thresholds, the coverage bonus, and the `signals`
  result shape are unchanged; phrase promotion only raises the relevance of an
  exact phrase hit. No dependencies change; the engine stays pure and offline.
- Production additions total 106 lines (45 aliases, 57 scorer wiring, 4
  keywords); tests add 201 lines, including the real-catalog regression suite
  `test/core/inquiry/catalog-ranking.test.ts`.
- Expansion lives in one compact hand-written table plus four task-local
  keywords, the primary maintenance point; revisit past roughly 20 groups.

## Rationale

- The 0.85 discount keeps alias matches below same-tier direct matches, so
  expansion recovers recall without letting synonyms outrank literal terms.
- Sibling closure keeps expansion one hop from the typed term; containment
  keeps short aliases such as `lint` out of unrelated fields (`oxlint.config`).
- Phrase promotion ports astryx's reserved tier: without it, `auto update`
  ranked `deps/renovate` above `ci/auto-update`; the reserved score sits above
  observed alias-stacked results but below the strongest all-direct
  multi-signal result, so `agent skills` still ranks `agent/agents-md` first.
- The four keyword aliases are ordinary task metadata, not a new mechanism.

## Alternatives Considered

1. **Revert ADR 038 and restore the old synonym map.** Brings back the 92-line
   transitive table, cross-group closure, and undiscounted synonym scores that
   motivated the removal. Rejected: the recall problem did not require those
   defects.
2. **Accept the recall loss.** The battery showed 108 fewer results, a 0.203
   drop in mean top-1 relevance, a zero-result query, and a top-1 inversion.
   Rejected: the removal's documented queries survived, but the broader catalog
   surface did not.
3. **Add alias terms to task keywords only, with no central table.** Duplicates
   terms across the catalog and lets sibling terms drift. Rejected: one compact
   table is easier to audit.
4. **Adopt an external search library (for example Fuse.js or MiniSearch).**
   Adds a dependency and an index lifecycle to a pure, offline 29-task engine.
   Rejected: 45 lines of alias data and the existing tiers cover the need.

## Consequences

### Positive

- Recall is restored `[measured]`: the battery returns 168 results at 0.834
  mean top-1 relevance, zero-result queries are eliminated, `code` ranks
  `editor/vscode` first, `husky` returns 6, `commitlint` 5, and `updates`
  scores 0.831. `pnpm check` passes with 16/16 tasks and 703 tests passed /
  6 skipped `[verified]`.
- Direct and authored hits keep priority: the 0.85 discount and reserved phrase
  tier keep literal vocabulary above alias-only matches, so `skills`, `auto
  update`, `semver`, and `bump` rank their authored tasks first `[measured]`.
  Expansion stays contained to one 45-line file, tiers and signals shape stay
  stable, and the engine remains pure, offline, and dependency-free.

### Negative

- 106 production lines return to the maintained surface, and the alias table is
  a second hand-written list that can drift from task metadata. It is smaller
  and single-hop, but needs the same periodic review, now bounded to roughly 20
  groups before the design is revisited.
- Known rankings after the precision pass:
  - `analysis` favors `quality/knip` (intended); `quality gate` and `static
    analysis` favor `quality/lint-staged` and `lint/oxlint` (0.85) because
    those tasks author the exact phrases, outranking knip's alias score.
  - `node version` favors `quality/package-engines` (0.85) through phrase
    promotion, superseding the earlier accepted `release/versionrc` residual.
  - `npm scripts` favors `scripts/package-scripts` (0.85) over `scripts/npmrc`
    (0.785); package-scripts authors the exact phrase.
  - Other exact whole-phrase promotions to top-1: `ai tools` ->
    `agent/skills-install` (0.85), `conventional commits` ->
    `release/commitlint` (0.85), `dead code` -> `quality/knip` (0.85), and
    `package manager` -> `quality/package-engines` (0.85, tied with
    `workspace/pnpm-workspace` and broken by catalog order).
  - `vitest` and `jest` still return a weak `ci/ci` match; no task authors
    those terms, so expansion reaches the CI task's `test` keyword.
- Multi-word alias keys such as `build cache` still do not fire per token;
  phrase promotion covers whole queries only, so `build cache` reaches
  `monorepo/turbo` only when typed in full.
- Alias expansion can still outrank unrelated weak direct matches by a tier;
  the discount bounds this but does not eliminate it.

### Related Decisions

- ADR 038 (remove synonym expansion) - the transitive-map removal stands; this
  ADR restores a compact, discounted, single-hop expansion in its place, with a
  dated update note recorded on ADR 038.
- ADR 024 (natural-language task query) and ADR 037 (remove external task
  plugins) - tiers, weights, coverage bonus, and signals shape are unchanged;
  this ADR restores a bounded form of the original expansion and adds back a
  measured amount of code in the query engine only.
