# ADR-010: Surgical JSON Patching with jsonc-parser

**Status:** Accepted
**Date:** 2026-05-01

## Context

JSON config tasks previously serialized the merged object back to text. That destroyed user comments, reordered keys, changed indentation, and produced whole-file diffs for one-line changes.

## Decision

Patch JSON configs surgically: compute the target object with the merge logic, then apply the difference as byte-level text edits that preserve comments, key order, whitespace, indentation, and trailing commas. Use [`jsonc-parser`](https://github.com/microsoft/node-jsonc-parser) to compute the edits. Object-level merging and text-level patching remain separate steps.

## Rationale

Preservation beats normalization: users format and comment configs deliberately, and overwriting that is hostile. Minimal diffs make review easier, and the parser is maintained by Microsoft's VS Code team and battle-tested on JSONC files.

## Alternatives Considered

- Hand-written text parser: hundreds of lines of offset arithmetic for no gain.
- JSON5 stringify: does not preserve comments and only some formatting.
- AST-based rewriting: no mature JSONC AST tool, overkill for config patches.

## Consequences

- Config diffs stay minimal and preserve user formatting.
- A runtime dependency on `jsonc-parser` is added, and the CLI bundler must keep it external.
- Test expectations must account for preserved formatting instead of normalized output.
