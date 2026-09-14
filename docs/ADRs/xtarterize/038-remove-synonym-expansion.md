# ADR 038: Remove Synonym Expansion from Task Query Scoring

## Status

Superseded by [ADR 039](039-restore-compact-alias-expansion.md).

ADR 039 later restored a compact, discounted, single-hop alias expansion; the removal of the transitive synonym map stands.

## Date

2026-09-13

## Context

The query engine introduced a hardcoded synonym map that expanded each query token with its values, matched tokens back to keys whose value lists contained them, and transitively added those keys' other values before scoring. The map was a second, hand-maintained catalog that had to track task metadata, and the ADR that introduced it already expected periodic updates as tasks were added.

## Decision

Remove the synonym map and the synonym-expansion step from scoring; score only the tokenized query. Stemming and fuzzy matching stay. The match tiers, coverage bonus, weighted signals, relevance thresholds, and result shape are unchanged, and the engine stays pure, offline, and dependency-free.

## Rationale

- Task metadata already carries the terms each task wants to match, so the map duplicated that intent in a place nothing enforced.
- Removing the map removes the hand-maintained catalog and its call sites.
- The package is private and bundled into the CLI, so dropping the export breaks no external consumer.
- The larger cut (synonyms plus stemming) was rejected by evidence: it inverted the top result for a documented query and made a documented threshold example return nothing.

## Alternatives Considered

- **Keep the synonym map.** Keeps the maintenance liability, for recall that tokenization, stemming, and fuzzy matching already cover.
- **Remove synonyms and stemming.** Measured to invert a documented ranking and empty a threshold example; rejected.
- **Remove stemming only.** Drops a load-bearing matching tier while keeping the map; rejected.

## Consequences

### Positive

- The map, its call sites, and its dedicated tests leave the maintained surface.
- Task metadata is the single source of matchable terms, and the engine stays dependency-free.

### Negative

- Non-literal recall dropped for queries that had matched through the map (ADR 039 later restored a bounded form).
- The export is gone from the package entry, an internal API break only.
