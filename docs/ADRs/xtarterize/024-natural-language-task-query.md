# ADR 024: Natural Language Task Query Engine

## Status

Accepted

## Date

2026-06-29

## Context

xtarterize ships 26 built-in tasks (plus plugin tasks), organized into 11 groups. Currently, users must know a task's exact ID to target it (`xtarterize add lint/biome`), or use `xtarterize list` which shows all applicable tasks in a flat group listing. There is no way to:

1. Search tasks by natural language ("how do I set up strict TypeScript?")
2. Produce a ranked composition plan from a loose description ("react project with ci")
3. Programmatically score tasks against a query from plugins or tooling

The `@xtarterize/core` package has clean package boundaries, pure utilities, and zero CLI dependencies. Any new module must follow the same patterns.

## Decision

Add an optional `searchMeta` field to the `Task` interface and a pure-function scoring engine in `packages/core/src/inquiry/`. Expose two CLI surfaces: `xtarterize query <query>` for task discovery and `xtarterize init --compose <query>` for ranked composition plans.

The scoring engine uses 5 weighted signals (label 35%, id 25%, keywords 20%, group 10%, config 10%) with Levenshtein-based fuzzy matching, a domain-specific synonym expansion map, and tokenization with stopword filtering. No AI model or external dependencies are used — the algorithm is pure keyword + fuzzy matching.

Note: The config signal falls back to `tags` when `configTargets` is undefined on a task's `searchMeta`. This ensures tasks with only tags metadata still participate in config-target matching.

### Module layout

```
packages/core/src/inquiry/
  index.ts          # Barrel exports: scoreTasks, tokenize, similarity, expandQuery
  types.ts          # InquiryResult, RelevanceSignal, WeightConfig, InquiryOptions
  fuzzy.ts          # levenshtein(), similarity() — pure, no deps
  stemmer.ts        # stem() — simple suffix-stripping stemmer
  tokenizer.ts      # tokenize() — query tokenization with stopword filter
  synonyms.ts       # SYNONYM_MAP — domain-specific expansion for tooling terms
  scorer.ts         # scoreTasks() — main scoring engine
```

### Task interface changes

An optional `searchMeta` field was added to the `Task` interface:

```typescript
interface TaskSearchMeta {
  tags: string[]
  configTargets: string[]
  keywords: string[]
}

interface Task {
  // ... existing fields unchanged
  searchMeta?: TaskSearchMeta
}
```

All 6 task factory functions and all 26 built-in tasks have been updated with search metadata.

### CLI changes

- `xtarterize query <query>` — New command for task discovery by natural language. Supports `--limit`, `--threshold`, and `--json`.
- `xtarterize init --compose <query>` — Existing init command extended with a `--compose` flag that reorders tasks by relevance before presentation.

## Consequences

### Positive

- Users can discover tasks by natural language without knowing IDs
- Plugin tasks automatically participate in scoring through the Task interface
- All scoring logic is pure functions — testable, dependency-free, fast
- Existing commands unchanged — fully backward compatible
- Tasks without `searchMeta` are still scored on label, id, and group

### Trade-offs

- Every built-in task (26) needs `searchMeta` added — mechanical but one-time work
- Scoring is algorithmic and will never match the nuance of AI — this is by design
- Synonym map is hardcoded and may need periodic updates as the task catalog grows

## Alternatives Considered

### Separate search index registry

A parallel `TaskIndex` alongside tasks. Rejected because the index could drift from actual task definitions, and plugins would need to register in two places.

### LLM-based query parsing

Using an API or model to parse queries. Rejected because it requires an AI dependency, has latency per query, is unavailable offline, and violates the "no AI" requirement.

### Regex-based classification

Hardcoded patterns per task. Rejected because it doesn't scale to plugin tasks and is less composable than signal-based scoring.
