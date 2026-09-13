# ADR 039: Restore Compact Alias Expansion for Task Query Scoring

## Status

Accepted

## Date

2026-09-14

## Context

ADR 038 (commit 207a311) removed the 92-line `SYNONYM_MAP` and its transitive,
cross-group expansion from `packages/core/src/inquiry/`. Tokenization,
stemming, fuzzy and prefix matching, substring matching, the coverage bonus,
and the signal weights were untouched. The removal was accepted on the strength
of five documented queries; it did not measure the rest of the catalog surface.

A 33-query battery over the built-in catalog then measured the regression
`[measured]`:

- Results dropped from 191 to 83, and mean top-1 relevance fell from 0.783 to
  0.580.
- `typing` returned zero results.
- `updates` fell from 0.925 to 0.210.
- `husky` fell from 10 results to 1.
- `code` inverted its top result from `editor/vscode` to `codegen/plop`.

ADR 038 was still right about the old map: it was a second, hand-maintained
catalog with transitive, cross-group closure, and its full-strength synonym
scores could outrank literal matches. The recall loss came from dropping
expansion entirely, not from those defects.

## Decision

Restore query expansion in a compact, precision-preserving shape inspired by
the search implementation in Meta's MIT-licensed Astryx design system
(`facebook/astryx`, `packages/cli/api/search/search.mjs`).

- `packages/core/src/inquiry/aliases.ts` holds 18 pipe-delimited, hand-written
  alias groups (45 lines). Expansion is bidirectional and sibling-closed within
  one group: every term maps to the other terms of its group, and aliases are
  never expanded again, so there is no cross-group transitive closure. A term
  listed in two groups gets the union of both groups, not their closure.
- The scorer matches each query token directly and then through its aliases.
  Alias-derived tier scores are multiplied by 0.85, so a direct hit outranks an
  alias hit at the same tier. A direct exact match still short-circuits at 1.0.
- Alias-derived substring matches require meaningful containment: the shorter
  side must be at least 4 characters and at least half the length of the longer
  side.
- A multi-word query that exactly matches an authored keyword is promoted to a
  reserved 0.85, above alias-stacked token paths. Single-word queries and
  non-exact phrases are not promoted. This ports astryx's reserved phrase tier
  and fixes `auto update`, `npm scripts`, `node version`, and `build cache`,
  where per-token expansion alone ranked an alias-stacked task first.
- Four tasks gained a task-local keyword alias through the existing
  `searchMeta.keywords` field: `typing` on `ts/strict`, `versioning` on
  `release/versionrc`, `updates` on `deps/renovate`, and `hooks` on
  `release/git-hooks` (4 lines total).
- Match tiers, weights, thresholds, the coverage bonus, and the `signals`
  result shape are unchanged; phrase promotion only raises the relevance of an
  exact phrase hit.
- Production additions total 106 lines (45 aliases, 57 scorer wiring, 4
  keywords); tests add 201 lines, including the real-catalog regression suite
  `test/core/inquiry/catalog-ranking.test.ts`.
- No dependencies change. The engine stays pure and offline.
- Expansion lives in one compact hand-written table plus four task-local
  keywords, and the table is the primary maintenance point. Revisit the
  approach if it grows past roughly 20 groups.

## Rationale

- The discount is what separates this from the old map. Expansion recovers
  recall while an alias match can only outrank a direct match when the alias
  scores at least one tier higher; a same-tier direct hit always wins.
- Sibling closure within one group keeps expansion one hop from the typed term.
  `renovate` expands to `package manager` inside its dependency group, but it
  does not chain through `package manager` into the workspace group.
- Containment-checked substrings stop short aliases from matching unrelated
  fields. Without the rule, an alias such as `lint` would reach the substring
  tier inside `oxlint.config`.
- Whole-phrase promotion ports astryx's reserved tier. Without it, `auto
  update` ranked `deps/renovate` above `ci/auto-update`: per-token expansion
  matched renovate's `auto` and `update` aliases while the authored phrase
  never matched as a unit. The reserved score sits above every observed
  alias-stacked result and below the strongest all-direct multi-signal result,
  so `agent skills` still ranks `agent/agents-md` first.
- The alias table lists each term once per group instead of once per key/value
  pair and needs no transitive closure pass, so it is 45 lines against the old
  map's 92 with a single table to audit.
- The four keyword aliases are ordinary task metadata, so the tasks that anchor
  those queries also win direct hits, and no new task-level mechanism is
  introduced.

## Alternatives Considered

1. **Revert ADR 038 and restore the old synonym map.** Brings back the 92-line
   transitive table, cross-group closure, and undiscounted synonym scores that
   motivated the removal. Rejected: the recall problem did not require those
   defects.
2. **Accept the recall loss.** The measured battery showed 108 fewer results, a
   0.203 drop in mean top-1 relevance, a zero-result query, and a top-1
   inversion. Rejected: the removal's documented queries survived, but the
   broader catalog surface did not.
3. **Add alias terms to task keywords only, with no central table.** Every task
   would need to list every synonym, duplicating terms across the catalog and
   letting sibling terms drift apart over time. Rejected: one compact table is
   easier to audit.
4. **Adopt an external search library (for example Fuse.js or MiniSearch).**
   Adds a dependency to a pure, offline engine and an index lifecycle for a
   29-task catalog. Rejected: 45 lines of alias data and the existing tiers
   cover the need.

## Consequences

### Positive

- Recall is restored: the battery returns 168 results with mean top-1 relevance
  0.834, zero-result queries are eliminated, `code` ranks `editor/vscode` first
  again, `husky` returns 6 results, `commitlint` returns 5, and `updates`
  scores 0.831 `[measured]`. `pnpm check` passes with 16/16 tasks and 703 tests
  passed / 6 skipped `[verified]`.
- Direct and authored hits keep priority: the 0.85 alias discount and the
  reserved phrase tier keep literal task vocabulary above alias-only matches,
  so `skills`, `auto update`, `semver`, and `bump` rank their authored tasks
  first `[measured]`.
- Expansion lives in one 45-line file plus contained scorer wiring; tiers,
  weights, thresholds, and the `signals` shape stay stable for consumers.
- The engine stays pure, offline, and dependency-free.

### Negative

- 106 production lines return to the maintained surface, and the alias table is
  a second hand-written list that can drift from task metadata. It is smaller
  and single-hop, but it needs the same periodic review the old map did, now
  bounded to roughly 20 groups before the design should be revisited.
- Known rankings after the precision pass:
  - `analysis` favors `quality/knip` (intended), while `quality gate` and
    `static analysis` favor `quality/lint-staged` (`0.85`) and `lint/oxlint`
    (`0.85`) because those tasks author the exact phrases; phrase promotion
    outranks knip's alias-derived score.
  - `node version` favors `quality/package-engines` (`0.85`) through phrase
    promotion. This supersedes the earlier accepted `release/versionrc`
    residual: package-engines authors the exact `node version` keyword.
  - `npm scripts` favors `scripts/package-scripts` (`0.85`) over
    `scripts/npmrc` (`0.785`); package-scripts authors the exact phrase.
  - Other authored-phrase queries promoted to top-1 by exact whole-phrase
    matches: `ai tools` -> `agent/skills-install` (`0.85`),
    `conventional commits` -> `release/commitlint` (`0.85`), `dead code` ->
    `quality/knip` (`0.85`), and `package manager` ->
    `quality/package-engines` (`0.85`, tied with `workspace/pnpm-workspace`
    and broken by catalog order).
  - `vitest` and `jest` still return a weak `ci/ci` match; no task authors
    those terms, so alias expansion reaches the CI task's `test` keyword.
- Multi-word alias keys such as `build cache` still do not fire through
  expansion because expansion is applied per token; exact-phrase promotion now
  covers whole-query matches only, which is why `build cache` reaches
  `monorepo/turbo` only when typed as the full phrase.
- Alias expansion adds approximate matches that can still outrank unrelated
  weak direct matches when they score a tier higher. The discount bounds this
  but does not eliminate it.

### Related Decisions

- ADR 038 (remove synonym expansion) - the transitive-map removal stands. This
  ADR restores a compact, discounted, single-hop expansion in its place, and a
  dated update note records that on ADR 038.
- ADR 024 (natural-language task query) - the tiers, weights, coverage bonus,
  and signals shape are unchanged; this ADR restores a bounded form of the
  expansion the original engine carried.
- ADR 037 (remove external task plugins) - the same production-reduction round;
  this ADR adds back a measured amount of it in the query engine only.
