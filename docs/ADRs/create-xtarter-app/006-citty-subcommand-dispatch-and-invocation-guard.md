# ADR 006: Citty Subcommand Dispatch and Invocation Guard

## Status
Accepted

## Date
2026-09-06

## Context
`create-xtarter-app` is built on citty and has one command with a required
positional (the project name) plus a single subcommand (`preview`). Under
citty 0.2, an entry command that declares `subCommands` rejects any first
positional that does not match a subcommand name with
`Unknown command <name>` (`E_UNKNOWN_COMMAND`). The primary documented flow,
`create-xtarter-app my-app`, regressed to exactly that error, and the
regression shipped to npm without any suite noticing because dispatch only
breaks in the spawned bin, not in unit-level imports.

Two further citty 0.2 behaviors shaped the design:

- `runCommand` resolves `subCommands` and dispatches a matching subcommand,
  then still invokes the entry command's own `run` afterwards. An entry that
  has both a `run` and subcommands must therefore bail out of its `run` when
  the invocation targeted a subcommand.
- Undeclared flags are silently dropped by the parser, so a typo such as
  `--jsn` runs the command with defaults instead of what was requested.

## Decision
1. Expose `preview` as a subcommand only when the invocation actually
   targets it: `subCommands` is a resolver that checks the first positional
   (mirroring citty's own `findSubCommandIndex` via
   `findFirstPositionalIndex` from `@xtarterize/core`). Project names never
   reach subcommand matching.
2. The scaffold `run` returns early when the invocation targets `preview`,
   so a preview is not followed by the scaffold flow.
3. Usage rendering keeps `preview` discoverable by overriding `runMain`'s
   `showUsage` with a variant that always lists `preview` for the entry
   command's usage.
4. A citty plugin (`createInvocationGuard`, duplicated per app because
   `create-xtarter-app` is intentionally isolated) validates the raw
   invocation against declared args before dispatch and exits `1` with
   actionable stderr lines on unknown commands/options, including
   "Did you mean ...?" suggestions (`validateInvocation`,
   `findUnknownFlags`, `suggestSimilar` in `@xtarterize/core`).

## Rationale
- The dynamic resolver is the smallest change that restores the positional
  contract without forking citty or upgrading past the pinned 0.2 line.
- Fail-fast validation converts silent misbehavior (dropped flags) into
  errors both humans and agents can act on; the suggestion format matches
  the message styles agents already parse.
- `--help` output stays honest: `preview` remains listed even though the
  resolver hides it during dispatch.

## Alternatives Considered
- **Static `subCommands` + no positional handling**: rejected - this is the
  shipped regression.
- **Handle `preview` inside the entry `run`** (no subcommands at all):
  rejected - `preview --help` would render entry usage and `preview` would
  disappear from the COMMANDS section.
- **Fork or wrap citty's parser**: rejected - maintenance cost, and the
  guard already needs a parser-faithful reimplementation of positional
  detection, which is small and covered by unit tests.

## Consequences
- Any new subcommand must be added to the resolver, the guard's
  `subcommands` map, and the usage-override in `cli.ts`; the spawned-bin
  integration test (`test/integration/create-xtarter-app-cli.test.ts`) pins
  the dispatch contract.
- The guard must stay parser-faithful: its positional detection mirrors
  citty's `findSubCommandIndex` (flag values, inline values, `--`
  terminator). Divergence would produce false rejections of valid
  invocations.
- Typos now fail loudly instead of defaulting silently; scripts relying on
  unknown flags being ignored must declare them or fix the typo.
