# ADR 006: Citty Subcommand Dispatch and Invocation Guard

## Status
Accepted

## Date
2026-09-06

## Context

`create-xtarter-app` has one command with a required positional (the project name) plus a single subcommand (`preview`). Citty rejects any first positional that does not match a subcommand name when the entry command declares subcommands, so the documented flow `create-xtarter-app my-app` regressed to an unknown-command error and shipped to npm because unit-level imports do not exercise dispatch. Two further citty behaviors shaped the design: dispatching a subcommand still invokes the entry command's own run, and undeclared flags are silently dropped by the parser.

## Decision

- Expose `preview` as a subcommand only when the invocation targets it: the subcommand list is resolved from the first positional, so project names never reach subcommand matching.
- The scaffold run returns early when the invocation targets `preview`, so a preview is not followed by the scaffold flow.
- Usage rendering always lists `preview` for the entry command, keeping it discoverable in help.
- An invocation guard validates the raw invocation against declared arguments before dispatch. Unknown commands and options exit with actionable stderr lines and "Did you mean ...?" suggestions.

## Rationale

- The dynamic resolver is the smallest change that restores the positional contract without forking citty.
- Fail-fast validation turns silent misbehavior (dropped flags) into errors humans and agents can act on.
- Help output stays honest: `preview` remains listed even though the resolver hides it during dispatch.

## Alternatives Considered

- **Static subcommands with no positional handling:** this is the shipped regression.
- **Handle `preview` inside the entry run:** `preview --help` would render entry usage and `preview` would disappear from the command list.
- **Fork or wrap citty's parser:** maintenance cost, while the guard already needs a small, parser-faithful positional check.

## Consequences

- Any new subcommand must be added to the resolver, the guard's known subcommands, and the usage override; a spawned-binary integration test pins the dispatch contract.
- The guard must stay parser-faithful (flag values, inline values, the `--` terminator); divergence would reject valid invocations.
- Scripts that relied on unknown flags being ignored must declare them or fix the typo.
