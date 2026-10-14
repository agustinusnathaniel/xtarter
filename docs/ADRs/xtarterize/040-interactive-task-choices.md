# ADR 040: Interactive Task Choices

## Status

Accepted

## Date

2026-10-14

## Context

Some tasks bundle many independent items. The agent skills task installs every catalog skill that matches the project, which can be dozens, and users want to pick a subset during an interactive run without giving up the non-interactive default. Tasks cannot prompt themselves: they run inside the engine while a spinner owns the terminal, and the task packages must stay free of terminal concerns.

## Decision

A task may optionally declare choices: a message, a loader that returns its options grouped under headings, and a way to produce the same task restricted to a chosen subset.

- The CLI asks before planning, and only in interactive runs. For each task with choices it offers install all, choose, or skip; choosing shows the grouped options, all preselected, where a group heading toggles the whole group.
- The restricted task replaces the original for that run, so checking, planning, backups, and applying all see the same subset.
- Non-interactive runs (`--yes`, JSON output, quiet or non-terminal sessions, `add --all`) never ask and apply every option, exactly as before.
- A selection lasts for one run. Deselected items stay pending, so later checks report the task as partially applied, consistent with deselecting a whole task.
- A task with at most one option is applied without asking.

## Rationale

- Restricting the task, rather than passing answers into it, keeps the task interface unchanged for every existing task and keeps each task's check and apply in agreement about the same subset.
- Asking in the CLI before planning keeps prompts out of the engine and out of the task packages, which stay testable without a terminal.
- One generic capability lets any future multi-item task offer the same interaction without the CLI knowing task specifics.

## Consequences

- The skills catalog carries a display group for each entry.
- Persisting a selection across runs is not supported; a project that never wants certain items has no per-item opt-out yet beyond skipping the task.

## Alternatives

- **Prompt from inside the task during apply**: conflicts with the apply spinner and would put terminal I/O into the task packages.
- **Persist the selection in the xtarterize config**: makes later checks quieter, but adds a config write outside the backup and undo flow; deferred until there is demand.
- **A skills-specific command or flag**: couples the CLI to one task and leaves other multi-item tasks without the interaction.
