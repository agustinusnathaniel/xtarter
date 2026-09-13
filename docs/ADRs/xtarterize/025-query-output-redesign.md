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

1. **Signal breakdown per result** - a second line of per-signal scores;
   debugging detail, not actionable information.
2. **Relevance bars** - the `████░` bar adds nothing beyond the percentage.
3. **Tier headers** - "EXACT / STRONG / RELATED" partitions results that the
   percentage already ranks continuously.
4. **No config target** - "what file does this touch?" is buried in
   `searchMeta` and never displayed.
5. **No next step** - no hint about how to apply a result.
6. **No count in header** - how many results were found is not visible.

### Design goals

Compact (one line per result), scannable (colored percentage as the visual
anchor), informative (config target for relevance judgment), actionable
(footer hint), and distinctive (not astryx's multi-line result blocks).

### What is NOT changing

- `--json` output (already clean, machine-readable, includes signals)
- The scoring engine, and `xtarterize init --compose` which uses it
- The `InquiryResult` type - signals remain in the data model for debugging

## Decision

Replace `displayQueryResults` in `apps/xtarterize/src/ui/query-display.ts` with
a terminal layout of three parts: a header (icon + query + result count), one
body line per result (dimmed task ID, colored relevance, label, dimmed config
target), and a footer hint naming the `xtarterize add` command. The
`formatQueryResult` JSON path is unchanged.

Each row is
`indent(2) + taskId.padEnd(maxIdLen + 2) + relevance(4) + " " + label + right-aligned configTarget`,
sized to `process.stdout.columns`. If a row would exceed the terminal width,
truncate the label first (appending an ellipsis), then the config target.

Relevance colors: >=70% green + bold ("strong match"), 40-69% yellow + bold
("partial match"), <40% dim ("weak match").

### States

Normal output (one line per result):

```
✻ xtarterize query "strict typescript" - 4 matches

  ts/strict                80%  tsconfig - strict: true             tsconfig.json
  ts/paths                 52%  tsconfig - path aliases             tsconfig.json
  ts/incremental           24%  tsconfig - incremental: true        tsconfig.json
  gitignore/tsbuildinfo    14%  .gitignore - tsbuildinfo             .gitignore

  → xtarterize add <task-id> to apply a task
```

Zero results and entirely-stopword queries substitute their own guidance (try
broader terms or `--threshold 0.05`; for stopwords, try specific tool names). A
single result uses the same layout with the footer hint
`xtarterize add <task-id> to apply`.

### Migration

- Replace `displayQueryResults` in `query-display.ts` (inline; no new module)
  and update `apps/docs/src/content/docs/xtarterize/guide/cli/query.mdx`.
- Remove the unused `relevanceBar` and `signalBreakdown` helpers.

### Retained paths

- **`--json`**: unchanged - `formatQueryResult` in `json-formatter.ts` still
  includes the full `signals` array.
- **`--verbose`** (future): print the signal breakdown on demand; not
  implemented in this change.

Update (2026-09-11): `--verbose` was never added to `query`. The command
accepts `--cwd`, `--json`, `--limit`, and `--threshold`; `--json` remains the
way to see signal scores.

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
