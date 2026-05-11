# ADR-010: Surgical JSON Patching with jsonc-parser

**Status:** Accepted
**Date:** 2026-05-01

## Context

JSON configuration tasks (`tsconfig.json`, `biome.json`, `turbo.json`, `.vscode/settings.json`) previously used `JSON.stringify(mergeJson(...), null, 2)` to produce the patched output. This approach:

- Destroyed user comments (`//`, `/* */`)
- Reordered keys alphabetically, breaking intentional grouping
- Changed indentation style (tabs → spaces, or 4 spaces → 2 spaces)
- Produced large noisy diffs even for tiny changes

For example, adding `incremental: true` to a `tsconfig.json` with comments and custom formatting would rewrite the entire file.

## Decision

Introduce `patchJson` in `@xtarterize/patchers`, powered by Microsoft's [`jsonc-parser`](https://github.com/microsoft/node-jsonc-parser). It generates byte-level text edits that preserve:

- Comments (inline `//` and block `/* */`)
- Key ordering
- Whitespace and indentation style
- Trailing commas (in JSONC)

Tasks that write JSON configs shall use `patchJson` for the final text transformation, while still using `mergeJson` for the object-level merge logic.

## Implementation

```typescript
// 1. Compute target state via mergeJson
const actual = parseJsonc(before)
const merged = mergeJson(actual ?? {}, incoming)

// 2. Apply surgically via patchJson
const after = patchJson(before, merged)
```

`patchJson` uses `jsonc-parser` to compute `Edit[]` operations (insert, replace, delete at byte offsets) and applies them in reverse order to avoid offset shifting.

## Rationale

- **Preservation > Normalization**: Users intentionally format and comment their configs. Overwriting them is hostile.
- **Minimal diffs**: Only the changed lines appear in `diff` output, making review easier.
- **Ecosystem standard**: `jsonc-parser` is maintained by Microsoft (VS Code team) and battle-tested on millions of JSONC files.

## Alternatives Considered

| Approach | Rejected Because |
|----------|------------------|
| Custom text parser | Would require ~400 lines of complex offset arithmetic; NIH syndrome |
| `json5` stringify | Doesn't preserve comments; only preserves some formatting |
| AST-based (recast for JSON) | No mature JSONC AST tool; overkill for config patches |

## Consequences

- `@xtarterize/patchers` gains a new runtime dependency: `jsonc-parser`
- CLI bundler (`tsdown`) must mark `jsonc-parser` as `neverBundle` to avoid runtime module resolution errors
- All JSON config tasks (`createJsonMergeTask`, `createMultiFileJsonMergeTask`, `createPackageJsonTask`) now produce minimal, formatting-preserving diffs
- Test expectations must account for preserved formatting rather than normalized output
