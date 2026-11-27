# ADR-010: Config Patching Preserves the User's File

**Status:** Accepted
**Date:** 2026-05-01

## Context

Tasks patch config files and package scripts that users already own. Early versions serialized whole objects, concatenated arrays, compared keys only, and re-queued patches the user had overridden. Each produced noisy or destructive diffs, and some looped forever. This record consolidates the decisions that fixed them, previously ADRs 007, 008, 012, and 016.

## Decision

- **Surgical text edits.** Compute the target object with the merge logic, then apply only the differences as text edits through `jsonc-parser`, so comments, key order, indentation, and trailing commas survive.
- **Arrays replace.** A merge replaces an array value instead of concatenating it; objects still merge deeply. The merge library concatenates by default, which doubled lists such as presets on every run.
- **Three states per key.** A missing key is patched, a matching key is skipped, and a key with a different value is a conflict. Conflicts are reported, never overwritten. Package scripts are the exception: an existing script name is left as the user wrote it, neither patched nor reported.
- **Equivalence by value, not name.** A proposed script counts as present when an existing script, under any name, runs an equivalent command: the same command, the same kind of tool with the same arguments or an equivalent subcommand, or a reference to the same script. Commands whose tool is not recognized are never equivalent. Text files compare with normalized line endings. xtarterize adds only the scripts with no equivalent, builds composite scripts from the project's existing names, and never renames or overwrites a script.

## Rationale

Running xtarterize on an already-conformant project must change nothing, and a user's explicit choice outranks xtarterize's recommendation. Each rule removes one way the old behavior broke that: whole-file rewrites, duplicated array entries, patch loops on user overrides, and false conflicts from renamed scripts.

## Alternatives Considered

- **Serialize the merged object.** Destroys comments and formatting, and turns one-line changes into whole-file diffs.
- **Hand-written text patching or an AST rewriter.** Hundreds of lines of offset arithmetic, and no mature JSONC AST tool.
- **Concatenate arrays.** Duplicates entries on every run.
- **A present-or-absent check per key.** Loops forever when the user sets a different value.
- **Overwrite mismatched values or scripts.** Silently discards deliberate user configuration.
- **Match on the tool alone.** Too aggressive: two commands from the same tool can do different jobs.
- **Normalize scripts to xtarterize's preferred names.** Forces xtarterize's conventions on projects that already chose their own.

## Consequences

- Diffs stay minimal, and a second run produces none.
- A task can only replace an array wholesale; it cannot append one item to a user's list.
- `jsonc-parser` is a runtime dependency that the CLI bundler keeps external.
- Composite scripts follow the order of the project's own script definitions, which may differ from the recommended order.
- User overrides surface as conflicts that need manual resolution.
- Equivalence is heuristic: a script that does the same job through an unrecognized tool still gets a duplicate added beside it.
