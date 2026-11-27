# ADR 024: Offline Task Query Engine

## Status

Accepted

## Date

2026-06-29

## Context

Users had to know a task's exact ID to target it, or scan a flat list of every applicable task. The `query` command and `init --compose` let them search by description and get a ranked plan. The engine lives in core, so it must stay free of dependencies. This record absorbs ADR 039, which restored query expansion.

## Decision

- Tasks carry optional search metadata, and a pure scoring engine in core ranks them. Scoring combines weighted signals (label, id, keywords, group, config targets) with tokenization, stemming, and fuzzy, prefix, and substring matching. No AI model or external service is involved.
- Query expansion uses one compact, hand-written alias table. A term expands to the other members of its group, one hop only, with no closure across groups; a term in two groups gets the union of both.
- Alias matches score below direct matches at the same tier, alias substrings need meaningful containment, and a multi-word query that exactly matches an authored keyword ranks in a reserved tier above alias matches. The design follows the search in Meta's MIT-licensed Astryx design system.
- Tasks add vocabulary through their keywords; the alias table holds synonyms shared across tasks.

## Rationale

- Pure functions keep the engine fast, offline, deterministic, and testable.
- The alias table is a reversal, not a first attempt. The original transitive synonym map let synonyms outrank literal terms, so expansion was removed entirely (ADR 038). A broader query battery then measured a recall regression: zero-result queries and inverted top results. The compact table restores recall, and the discount keeps literal matches ahead.
- Stemming stays: a cut that also removed it inverted a documented ranking.

## Alternatives Considered

- **LLM-based query parsing.** Adds an AI dependency, latency, and an offline failure mode, against the no-AI requirement.
- **An external search library.** Adds a dependency and an index lifecycle to a pure engine.
- **A separate search index registry.** Drifts from task definitions, and tasks would register in two places.
- **The original transitive synonym map.** Synonyms outranked literal matches.
- **No expansion.** Measured recall loss.
- **Aliases only in task keywords.** Duplicates terms across the catalog and lets them drift.

## Consequences

- Scoring cannot match an AI model's nuance, by design.
- The alias table is a second hand-written list that can drift from task metadata; revisit the design if it grows beyond a small, reviewable size.
- Alias expansion can still outrank an unrelated weak direct match by one tier; the discount bounds this but does not remove it.
- Multi-word alias keys never fire per token, so phrase promotion covers whole queries only.
