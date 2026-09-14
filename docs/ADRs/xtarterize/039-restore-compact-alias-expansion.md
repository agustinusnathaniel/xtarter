# ADR 039: Restore Compact Alias Expansion for Task Query Scoring

## Status

Accepted

## Date

2026-09-14

## Context

ADR 038 removed the transitive synonym map and its cross-group expansion, leaving tokenization, stemming, fuzzy and prefix matching, substring matching, the coverage bonus, and signal weights untouched. The old map was indeed a hand-maintained catalog that could outrank literal matches, but a broader query battery measured a recall regression: fewer results, lower relevance, zero-result queries, and inverted top results. The loss came from dropping expansion entirely, not from those defects, so this is not a revert.

## Decision

Restore query expansion in a compact, precision-preserving shape inspired by the search implementation in Meta's MIT-licensed Astryx design system.

- One hand-written alias table holds pipe-delimited groups, expanded bidirectionally and sibling-closed within a group: aliases are never expanded again, there is no cross-group closure, and a term in two groups gets the union of both.
- The scorer matches each token directly and then through its aliases, discounting alias-derived scores so a direct hit outranks an alias hit at the same tier; direct exact matches still short-circuit at the top.
- Alias-derived substring matches require meaningful containment, so short aliases cannot match unrelated fields.
- A multi-word query that exactly matches an authored keyword is promoted to a reserved tier above alias-stacked token paths, fixing phrase queries.
- Aliases live in the core alias table, while tasks contribute keywords through their search metadata; match tiers, weights, thresholds, coverage bonus, result shape, and dependencies are unchanged.
- The alias table is the primary maintenance point; revisit the design if it grows beyond a bounded size.

## Rationale

- The discount keeps alias matches below same-tier direct matches, recovering recall without letting synonyms outrank literal terms.
- Sibling closure keeps expansion one hop from the typed term, and containment keeps short aliases out of unrelated fields.
- Phrase promotion ports Astryx's reserved tier, which sits above observed alias-stacked results but below the strongest all-direct result.

## Alternatives Considered

- **Revert ADR 038 and restore the old map.** Brings back the transitive table and undiscounted cross-group matches that motivated the removal.
- **Accept the recall loss.** The battery showed fewer results, lower relevance, zero-result queries, and a top-1 inversion.
- **Put aliases in task keywords only.** Duplicates terms across the catalog and lets siblings drift.
- **Adopt an external search library.** Adds a dependency and an index lifecycle to a pure, offline engine.

## Consequences

### Positive

- Recall is restored in measurement: zero-result queries are gone and inverted top results are fixed.
- Literal vocabulary still outranks alias-only matches, and the engine stays pure, offline, and dependency-free.

### Negative

- The alias table is a second hand-written list that can drift from task metadata and needs periodic review.
- Multi-word alias keys still do not fire per token, so phrase promotion covers whole queries only.
- Alias expansion can still outrank unrelated weak direct matches by a tier, which the discount bounds but does not eliminate.
