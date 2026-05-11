# ADR-007: Array Replacement in JSON Merge Strategy

**Status:** Accepted  
**Date:** 2026-04-29

## Decision

`mergeJson` (used for `biome.json`, `tsconfig.json`, VSCode settings, etc.) shall **replace arrays** rather than concatenate them. This is implemented via a custom `createDefu` callback that overwrites array values instead of merging them.

## Rationale

The default `defu` behavior concatenates arrays: `[100] + [100] = [100, 100]`. For JSON configuration files, this produces incorrect results:

- `editor.rulers: [100]` merged with `editor.rulers: [100]` → `[100, 100]` (duplicate ruler)
- `extends: ["biome"]` merged with `extends: ["biome"]` → `["biome", "biome"]` (duplicate extends)

Configuration arrays are typically intentional replacements, not additive collections.

## Implementation

```typescript
const mergeJsonDefu = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})
```

## Consequences

- Array values in JSON configs are replaced, not merged.
- Prevents duplicate values in `biome.json`, `tsconfig.json`, `.vscode/settings.json`.
- Object merging remains deep and additive (the desired behavior for non-array values).
