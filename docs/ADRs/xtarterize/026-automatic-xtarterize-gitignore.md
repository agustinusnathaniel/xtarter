# ADR 026: Automatically gitignore `.xtarterize/` in Target Projects

## Status

Accepted

## Date

2026-07-01

## Context

Normal operation creates a `.xtarterize/` directory in target projects, holding backups and run state. Nothing ensured it was gitignored, so users saw untracked files in `git status` and had to add the entry by hand. These files are never committed or published, so this was friction rather than a correctness bug.

## Decision

Every command that creates or reads `.xtarterize/` ensures the project's `.gitignore` contains `/.xtarterize/` before doing its work. The check is idempotent: it creates the file when absent and appends the entry only when missing. Failure is non-fatal, and the command proceeds regardless.

## Rationale

- The directory is a tool side effect, not a user configuration choice, so it does not belong in a skippable task.
- A single hook covers every affected command: the helper runs once from the shared session open path, so no per-command wiring is needed.

## Alternatives Considered

- **A `gitignore/xtarterize` task.** Rejected: skippable at the prompt, and it would miss commands that do not run the task engine.
- **A single hook in a shared command router.** Rejected at the time: only `init` and `sync` routed through one. The shared session open path later provided this hook (ADR 030).
- **A hook in preflight validation.** Rejected: adds a write side effect to validation, violating least surprise.
- **A hook at each artifact creation site.** Rejected: decentralized, and easy to miss a new artifact path.

## Consequences

- Users no longer see `.xtarterize/` in `git status` after any command.
- The pattern is root-anchored, so nested directories with the same name are not ignored.
- A project without a `.gitignore` gets one, and existing files gain a comment header; both are deliberate, minor diffs.
- Write failures are ignored, so the entry is best-effort and never blocks a command.
- Concurrent invocations can both append the entry, producing a harmless duplicate.
- The helper runs once from the shared session open path, so any command that opens a session gets it.
