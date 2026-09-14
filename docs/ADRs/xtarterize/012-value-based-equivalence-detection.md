# ADR-012: Value-Based Equivalence Detection for Tasks

**Status:** Accepted
**Date:** 2026-05-01

## Context

The original task system compared only keys: whether a script name or config key existed. It missed cases with the same value under a different name, equivalent JSON shapes, and identical content with different line endings, so it produced redundant diffs or manual conflict prompts.

## Decision

Detect equivalence at the value or content level, not the key level:

- Package scripts: a proposed script is already present when the exact command string exists under any script name. Existing scripts are never overwritten. A script name that exists with a different command yields a patch that adds only the missing scripts, not a conflict.
- Text files: normalize line endings before comparing contents.
- JSON configs: equivalence flows through the merge target rather than a separate normalization helper.

## Rationale

Running init on an already-conformant project must produce zero changes. A renamed script or a differently formatted value is a user choice, not a conflict, and strict key matching is too brittle for projects that evolve organically.

## Alternatives Considered

- Keep key-level comparison: produces redundant diffs and false conflicts on common projects.
- Overwrite mismatched scripts: discards deliberate user choices.

## Consequences

- Already-conformant projects converge to no changes.
- A project's renamed scripts are respected; xtarterize does not enforce its preferred names.
- A mismatched script stays as the user wrote it, and only genuinely missing scripts are added alongside.
