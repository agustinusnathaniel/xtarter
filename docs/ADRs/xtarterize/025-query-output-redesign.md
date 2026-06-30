# ADR 025: Query Output Redesign

## Status

Accepted

## Date

2026-06-29

## Context

`xtarterize query` is the primary way users discover tasks by natural language
("strict typescript", "ci pipeline"). The current output was designed alongside
the scoring engine (ADR 024) but has proven too noisy for everyday use.

### Problems with the current output

1. **Signal breakdown per result** - every result prints a second line with
   per-signal scores (label: 100%, id: 75%, ...). This is debugging detail,
   not actionable information.

2. **Relevance bars are visual noise** - the ████░ bar takes 10 characters per
   row and adds no information beyond the percentage. A colored percentage alone
   is faster to scan.

3. **Tier headers add little value** - "EXACT MATCHES", "STRONG MATCHES",
   "RELATED" partition results into three groups but the relevance percentage
   already encodes this signal. The tiers force the user to read two things
   (tier + percentage) instead of one.

4. **No config target shown** - the most useful context for deciding whether a
   result is relevant ("what file does this touch?") is buried in the task's
   `searchMeta` and never displayed.

5. **No actionable next step** - after seeing results, the user has no hint
   about how to apply them.

6. **No count in header** - the user can't tell at a glance how many results
   were found.

### Design goals

- **Compact**: one line per result, no signal breakdown (available via `--verbose` or `--json`)
- **Scannable**: colored relevance percentage as the primary visual anchor
- **Informative**: show config target as context for relevance judgment
- **Actionable**: hint at the bottom tells the user how to proceed
- **Distinctive**: not copying astryx's multi-line result blocks

### What is NOT changing

- `--json` output (already clean, machine-readable, includes signals)
- The scoring engine itself
- `xtarterize init --compose` which uses the scoring engine internally
- The `InquiryResult` type - signals remain in the data model for debugging

## Decision

Replace `displayQueryResults` in `apps/xtarterize/src/ui/query-display.ts` with
a new terminal layout consisting of:

1. **Header**: icon + query + result count
2. **Body**: single line per result - dimmed task ID | colored relevance |
   label | dimmed config target
3. **Footer**: hint with the `xtarterize add` command

The existing `formatQueryResult` (JSON) path is unchanged.

### Line layout (annotated)

```
  ts/strict                80%  tsconfig - strict: true             tsconfig.json
  ↑dim                    ↑bold+colored                           ↑dim
```

Each row has four zones:

| Zone | Content                    | Style               | Width                                     |
| ---- | -------------------------- | ------------------- | ----------------------------------------- |
| 1    | Task ID, right-padded      | `pc.dim()`          | max(taskId.length) + 2                    |
| 2    | Relevance " XX%"           | `pc.bold()` + color | 4 chars fixed (RHS)                       |
| 3    | Label                      | normal              | remaining width (config column subtracts) |
| 4    | Config target, left-padded | `pc.dim()`          | computed per row                          |

### Color rules for relevance

| Range  | Color                       | Style           |
| ------ | --------------------------- | --------------- |
| ≥70%   | `pc.green()` + `pc.bold()`  | "strong match"  |
| 40–69% | `pc.yellow()` + `pc.bold()` | "partial match" |
| <40%   | `pc.dim()`                  | "weak match"    |

### States

**Normal (≥1 result):**

```
✻ xtarterize query "strict typescript" - 4 matches

  ts/strict                80%  tsconfig - strict: true             tsconfig.json
  ts/paths                 52%  tsconfig - path aliases             tsconfig.json
  ts/incremental           24%  tsconfig - incremental: true        tsconfig.json
  gitignore/tsbuildinfo    14%  .gitignore - tsbuildinfo             .gitignore

  → xtarterize add <task-id> to apply a task
```

**Zero results:**

```
✻ xtarterize query "strict typescript" - no matches

  No tasks matched your query.
    • try broader terms (e.g. "typescript" instead of "strict typescript")
    • lower the threshold with --threshold 0.05
    • browse all tasks with xtarterize list
```

**Entirely stopwords (tokenizes to empty):**

```
✻ xtarterize query "need help with" - no matches

  Your query "need help with" consists entirely of common words.
    • try specific tool names (e.g. "biome", "tsconfig", "vite")
    • use technical terms related to the setup you want
```

### Single result (slim variant):

```
✻ xtarterize query "biome formatting" - 1 match

  lint/biome              89%  Biome (lint + format)               biome.json

  → xtarterize add lint/biome to apply
```

Note: the footer hint changes to the specific task ID when there's one result.

### Column width logic

1. Compute `maxIdLen = max(results, r => r.taskId.length)`
2. Each row: indent(2) + taskId.padEnd(maxIdLen + 2) + relevance(4) + " " + label + right-aligned configTarget

For the label + config target area, use the terminal width (process.stdout.columns)
to determine available space. If the row would exceed terminal width:

- Truncate the label first (append "…")
- If still too wide, truncate the config target

### Migration

1. Replace `displayQueryResults` in `query-display.ts` with the new
   implementation (inline, no new file or module needed)
2. Update the docs at `apps/docs/src/content/docs/xtarterize/guide/cli/query.mdx`
   to show the new output
3. Remove unused helper functions: `relevanceBar`, `signalBreakdown`

### Retained paths

- **`--json`**: unchanged - `formatQueryResult` in `json-formatter.ts` remains
  as-is. JSON output still includes the full `signals` array.
- **`--verbose`** (future): if users need signal breakdown, add a `--verbose`
  flag to print the second line. Not implemented in this change - defer until
  someone asks.

## Consequences

### Positive

- **Less noise**: 1 line per result instead of 2-3 lines. At 10 results, that's
  10 lines instead of 20-30.
- **More information**: config target column replaces the removed signal
  breakdown with something users actually need to make decisions.
- **Actionable**: footer hint removes the "now what?" moment.
- **Scannable at a glance**: colored percentage is the visual anchor; users can
  spot the 80%+ results immediately.
- **Our own style**: single-line-per-result table format is distinct from
  astryx's multi-line block format.
- **Backward compatible**: JSON output unchanged. Terminal-only change.

### Negative

- **Loss of signal breakdown**: debugging won't show why a score is what it is.
  Mitigated by `--json` (always includes signals) and a future `--verbose`
  flag if demand arises.
- **Loss of tier headers**: users who relied on the "EXACT/STRONG/RELATED"
  grouping lose that structure. Mitigated by color coding which is a
  continuous spectrum instead of three discrete buckets.

### Risks

- **Very long config targets**: `.github/workflows/ci.yml` (26 chars) combined
  with a long task ID and label could exceed terminal width on narrow terminals.
  Mitigated by truncation logic - label is truncated first, then config target.
- **Emoji/icon rendering**: `✻` may not render well in all terminals. The icon
  is decorative (no information loss if it doesn't render). Fallback: remove
  the icon if `NO_COLOR` or `CI` env var is set.

## Alternatives Considered

### Keep tier headers, remove signal breakdown only

Rejected because tier headers add visual weight without commensurate value.
The relevance percentage is a continuous value - discretizing it into three
buckets loses information. Color coding preserves the continuum.

### Two-column layout (task ID + relevance, no config target)

Rejected because the most frequent user question is "what file does this
touch?" Showing the config target inline answers it without requiring the
user to look it up elsewhere.

### Multi-line block format (astryx-style)

Rejected by explicit constraint - the format must be distinguishable from
astryx's approach. One line per result is the clearest distinction.

### Drop percentage, show only color

Rejected because color is not accessible to all users (colorblindness,
`NO_COLOR` environments) and cannot be piped to grep or other tools.
The percentage is the universal signal.

### Related Decisions

- ADR 024: Natural Language Task Query Engine - defines the scoring engine
  and original output format that this ADR replaces

## Unresolved Questions

- Should `--verbose` add back the signal breakdown line? Defer until a user
  requests it.
- Should the footer hint be shown every time, or only on first query in a
  session? Start with always shown; remove if it feels patronizing.
