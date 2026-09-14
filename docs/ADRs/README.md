# Architecture Decision Records

This directory holds the architecture decision records for xtarterize. Each file records one decision and the reasoning behind it. Records live at the top level or in a subdirectory for the area they affect.

## Conventions

- One decision per file. If a change involves independent decisions, write one record for each.
- Name files `NNN-short-title.md`, using the next unused zero-padded number. Do not renumber existing records.
- Keep active records under about 500 words. Write for a future reader who needs the decision and why it was made, not a transcript of the discussion.
- Record the decision and its reasons, not the implementation. Never include repository file paths, file names, line counts, symbol names, code fences, version pins, or counts that change. Those details go stale.
- Change a decision by superseding it, not by rewriting it. A new record that reverses or replaces an old one links to the old one. Collapse the old record to a short stub when convenient, but keep it reachable and keep its Status accurate.

## Fields

New records have a Status, a Date, and the sections Context, Decision, Rationale, Consequences, and Alternatives when other options were considered. Status is one of `Proposed`, `Accepted`, `Rejected`, or `Superseded by ADR NNN`, where NNN links to the replacing record. Earlier records may predate this convention: some omit the Date or Context, and some use forms like bare `Superseded` or `Accepted (Supersedes ...)`.
