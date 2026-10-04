# Architecture Decision Records

This directory holds the architecture decision records for xtarterize. Each file records one decision and the reasoning behind it. Records live at the top level or in a subdirectory for the area they affect.

## Conventions

- One decision per file. If a change involves independent decisions, write one record for each.
- Name files `NNN-short-title.md`, using the next unused zero-padded number. Do not renumber existing records; gaps left by retired records are normal.
- Keep active records under about 500 words. Write for a future reader who needs the decision and why it was made, not a transcript of the discussion.
- Record the decision and its reasons, not the implementation. Never include repository file paths, file names, line counts, symbol names, code fences, version pins, or counts that change. Those details go stale.
- Not every change deserves a record. Routine maintenance policies, completed migrations and cleanups, feature-level or presentation details, and internal style conventions belong in code, in a guide, or in git history only.
- Change a decision by superseding it, not by rewriting it. A new record that reverses or replaces an old one states what it replaced. Once the replacing record carries the old record's reasoning, delete the old record rather than keeping a stub.

## Fields

New records have a Status, a Date, and the sections Context, Decision, Rationale, Consequences, and Alternatives when other options were considered. Status is one of `Proposed`, `Accepted`, or `Rejected`; a record whose decision has been replaced is retired per the Conventions, so `Superseded` statuses do not linger. Earlier records may predate this convention: some omit the Date or Context, and some use forms like `Superseded by ADR-NNN` or `Accepted (Supersedes ...)`.
