# ADR 024: Natural Language Task Query Engine

## Status

Accepted

External task plugins were later removed by ADR 037, and synonym expansion by ADR 038; ADR 039 restored a compact alias expansion. The scoring signals and the search metadata contract below remain as decided.

## Date

2026-06-29

## Context

Users had to know a task's exact ID to target it, or scan a flat `list` of all applicable tasks. There was no way to search by loose description, rank a composition plan, or score tasks programmatically. Any new module had to respect core's package boundaries and stay dependency-free.

## Decision

Add optional search metadata to the task interface and a pure-function scoring engine in core. Two CLI surfaces use it: `query <query>` for task discovery and `init --compose <query>` for ranked composition plans. Scoring combines weighted signals (label, id, keywords, group, config targets) with tokenization and fuzzy matching; no AI model or external dependency is involved.

## Rationale

- Natural-language discovery does not require users to memorize IDs.
- Pure functions keep the engine testable, fast, and offline.

## Alternatives Considered

- **A separate search index registry.** Rejected: it could drift from task definitions, and tasks would register in two places.
- **LLM-based query parsing.** Rejected: adds an AI dependency, latency, and an offline failure mode, against the no-AI requirement.
- **Regex-based classification.** Rejected: does not scale to new tasks and composes worse than signal scoring.

## Consequences

- Users can discover tasks by description; tasks without search metadata still score on label, id, and group.
- Scoring is algorithmic and cannot match AI nuance; this is by design.
- Every built-in task needs search metadata, and the match terms need updating as the catalog grows.
