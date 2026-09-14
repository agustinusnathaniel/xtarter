# ADR 030: Command Session Owns the Command Lifecycle

## Status

Accepted

## Date

2026-09-10

## Context

The CLI had four apply and report paths, two flag resolvers deriving JSON, quiet, and format, and repeated gitignore and preflight handling. Output was console-only, prompts and exits lived in core, and interactive `add` wrote a run manifest per task, so `undo` restored only the last task.

## Decision

A command session owns open, plan, execute, and report. Commands declare selection policy, prompts, and output shape; the session runs the lifecycle.

- The outcome carries applied and skipped counts, errors, statuses, diffs, and timing, and one reporter renders it through terminal and JSON adapters.
- Prompts are injected (interactive adapter in production, scripted in tests), and cancellation is an outcome, not a thrown exit.
- One runtime resolver and shared argument groups replace per-command flag derivation.
- The session owns the gitignore entry and preflight once per command; doctor opts out of fail-fast.
- The entry point sets the exit code from the outcome.
- One plan and execute per `add` operation, and one run manifest covering it, so `undo` restores the whole operation (ADR 022).
- The session runs as an Effect program with prompts from a service seam (ADR 036), and commands declare through a thin wrapper that adds no policy.

## Rationale

- One lifecycle removes four apply and report paths and two flag resolvers.
- Injected prompts make interactive flows testable and remove prompt and exit calls from core.
- One manifest per `add` makes `undo` restore the whole operation.
- Terminal and JSON render from the same outcome, including preflight failures under `--json`.

## Alternatives Considered

- **Unify report formatting only.** Leaves the apply paths, flag resolvers, and per-command preflight duplication.
- **Declarative command framework.** More machinery than the verbs need; the session boundary is the load-bearing part.
- **Keep prompts inside commands.** Untestable interactive flows and exit calls scattered across core and apps.

## Consequences

### Positive

- Exit codes are centralized, interactive flows are testable with a scripted prompter, and commands share one gitignore pass and one preflight.

### Negative

- One manifest per `add` changes `undo` to restore the whole operation, which needs a changeset.
- Core loses prompt and exit usage on its public path, so callers must be updated.
