# ADR 030: Command Session Owns the Command Lifecycle

## Status

Accepted

## Date

2026-09-10

## Context

The CLI had four apply and report paths, two flag resolvers, and repeated gitignore and preflight handling. Prompts and exits lived in core, and interactive `add` wrote a run manifest per task, so `undo` restored only the last task. Separately, the `.xtarterize/` directory that commands create for backups and run state was not gitignored, so users saw it as untracked. This record absorbs ADR 026, which added the gitignore entry.

## Decision

A command session owns open, plan, execute, and report. Commands declare their selection policy, prompts, and output shape; the session runs the lifecycle as an Effect program (ADR 036).

- One outcome carries counts, errors, statuses, diffs, and timing, and one reporter renders it for the terminal or as JSON. The entry point sets the exit code from it.
- Prompts are injected: an interactive adapter in production, a scripted one in tests. Cancellation is an outcome, not a thrown exit.
- Opening a session ensures the project's `.gitignore` has the root-anchored `.xtarterize/` entry, then runs preflight once. The gitignore write is idempotent and best-effort: a failure never blocks the command. Doctor opts out of fail-fast preflight.
- Each `add` operation plans and executes once under one run manifest, so `undo` restores the whole operation (ADR 022).

## Rationale

- Injected prompts make interactive flows testable and keep prompt and exit calls out of core.
- Terminal and JSON output render from the same outcome, including preflight failures under `--json`.
- The gitignore entry is a side effect of the tool, not a configuration choice, so it belongs in the one path every command opens rather than in a task.

## Alternatives Considered

- **Unify report formatting only.** Leaves the duplicated apply paths, flag resolvers, and preflight.
- **A declarative command framework.** More machinery than the commands need; the session boundary is the part that matters.
- **Keep prompts inside commands.** Untestable interactive flows, and exits scattered across core and apps.
- **A gitignore task.** Users can skip it at the prompt, and it misses commands that do not run tasks.
- **Add the entry during preflight, or wherever an artifact is created.** Preflight would gain a write side effect, and per-site hooks are easy to miss for a new artifact.

## Consequences

- Exit codes are set in one place, and interactive flows run in tests with a scripted prompter.
- A project without a `.gitignore` gets one, and concurrent invocations can append a harmless duplicate entry.
