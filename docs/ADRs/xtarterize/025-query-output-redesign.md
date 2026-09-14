# ADR 025: Query Output Redesign

## Status

Accepted

## Date

2026-06-29

## Context

`xtarterize query` is the primary way users discover tasks by description, but its output was designed alongside the scoring engine (ADR 024) and proved too noisy: per-signal score breakdowns, relevance bars, tier headers, and no indication of which file a task touches or how to apply it.

## Decision

Present each result as one line: task ID, relevance percentage, label, and the config target the task touches, under a header with the query and result count and above a footer naming the `xtarterize add` command. The colored percentage is the visual anchor, and long rows truncate rather than wrap. The machine-readable `--json` output, signal scores included, is unchanged, as are the scoring engine and `init --compose`.

## Rationale

- One line per result is compact and scannable, and the config target answers the most common follow-up question.
- The footer removes the "now what?" moment.
- The single-line format is deliberately distinct from astryx's multi-line block format.

## Alternatives Considered

- **Keep tier headers, remove only the signal breakdown.** Rejected: headers add weight without value, and the percentage already ranks continuously.
- **Two columns, without the config target.** Rejected: "what file does this touch?" is the most frequent user question.
- **Show color only, drop the percentage.** Rejected: color is inaccessible to some users and cannot be piped to tools.
- **Multi-line block format.** Rejected: the format must stay distinguishable from astryx's.

## Consequences

- Results are faster to scan and carry more decision-relevant information per line.
- Debugging why a score is what it is requires `--json`, which always includes the signals; a verbose flag was considered but never added.
- Very long labels and config targets can still exceed narrow terminals; the label truncates first, then the target.
- The decorative icon may not render in every terminal; it carries no information.
