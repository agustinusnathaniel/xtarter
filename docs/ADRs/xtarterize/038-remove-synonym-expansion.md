# ADR 038: Remove Synonym Expansion from Task Query Scoring

## Status

Accepted

## Date

2026-09-13

## Context

ADR 024 introduced the natural-language query engine and, with it, a hardcoded
`SYNONYM_MAP` in `packages/core/src/inquiry/synonyms.ts`. `expandQuery()`
expanded each query token with the map's values, matched tokens back to keys
whose value lists contained them, and transitively added those keys' other
values before scoring. ADR 024 already flagged the cost: the map "is hardcoded
and may need periodic updates as the task catalog grows."

The repository owner authorized removing synonym expansion as part of
production-code reduction. The candidate surface was about 131 production
lines: the 92-line map, its call sites, and the 28-line stemmer. The narrow cut
(synonyms only, -102 production lines) was compared against the full cut
(synonyms plus stemming, -131) by scoring the 29-task built-in catalog
`[verified]`.

The full cut broke two documented behaviors:

- `query "linting and formatting tool"` ranked `agent/skills-install`
  (0.143333) above `lint/biome` (0.141667), an inversion of about 0.0016.
- `query "react testing" --threshold 0.2` returned zero results.

The narrow cut kept the documented rankings: `lint/biome` first at 0.332,
`react testing` still returned `ci/ci` at 0.240, `strict typescript` still
ranked `ts/strict` at 0.800, `ci pipeline` still returned `ci/ci` at 0.880,
and `dependency updates` still ranked `deps/renovate` at 0.385 `[verified]`.

## Decision

Remove `packages/core/src/inquiry/synonyms.ts` and the synonym-expansion step
from scoring. `scoreTasks` now scores only the tokenized query.

- `expandQuery` and `SYNONYM_MAP` are deleted. `expandQuery` is no longer
  exported from `packages/core/src/inquiry/index.ts` or the root
  `@xtarterize/core` entry.
- The match tiers (exact 1.0, stem-match 0.95, fuzzy 0.85, prefix 0.75,
  substring 0.55), the coverage bonus, the weighted signals, the relevance
  thresholds, and the `signals` result shape are unchanged.
- Stemming and fuzzy matching are retained.
- No dependencies change. The engine stays pure and offline.

## Rationale

- The map was a second, hand-maintained catalog that had to track task
  metadata, and ADR 024 expected it to need periodic updates as tasks were
  added. Task `searchMeta` already carries the terms each task wants to match;
  the map duplicated that intent in a place nothing enforced.
- The full cut was rejected by evidence, not preference: it inverted the top
  result for a documented query and made a documented threshold example return
  nothing. Stemming earns its 29 lines, and fuzzy matching stays.
- The package is private and bundled into the CLI, so removing `expandQuery`
  from the exported surface breaks no external consumer.
- The documented rankings above survive the narrow cut; only non-literal
  queries that relied exclusively on the map lose recall.

## Alternatives Considered

1. **Keep the synonym map.** Retains the maintenance liability ADR 024 already
   named, for recall that tokenization, stemming, and fuzzy matching already
   cover in the documented examples.
2. **Remove both synonyms and stemming (full cut, -131 lines).** Measured
   against the built-in catalog, it flipped `query "linting and formatting
   tool"` to `agent/skills-install` and emptied `query "react testing"
   --threshold 0.2`. Rejected.
3. **Remove stemming only.** Keeps the map and the maintenance liability while
   dropping a matching tier that the full-cut experiment showed to be
   load-bearing. Rejected.

## Consequences

### Positive

- 102 production lines and the 85-line synonym test suite leave the maintained
  surface: the map, its call sites, and its dedicated tests.
- The task catalog is the single source of matchable terms; there is no second
  list to update when tasks change.
- The engine stays dependency-free, pure, and offline.

### Negative

- Non-literal recall drops. `types` and `typing` no longer reach the TypeScript
  task terms, `updates` no longer reaches the dependency task terms, and `code`
  no longer reaches the editor task terms. Users must name the domain or task
  terms more directly, or lower `--threshold`.
- `expandQuery` is no longer exported from `@xtarterize/core`. The package is
  private and bundled into the CLI, so the removal is an internal API break
  only.
- Relevance percentages shift for queries that previously matched through the
  map, because their scores now come only from direct token matches.

### Related Decisions

- ADR 024 (natural-language task query) - introduced the engine and the synonym
  map; its synonym-expansion parts are superseded by this ADR. Stemming, fuzzy
  matching, and the weighted signals remain as decided there.
- ADR 037 (remove external task plugins) - the same production-reduction round;
  its changeset already carries the pending major group bump that this change
  rides.
