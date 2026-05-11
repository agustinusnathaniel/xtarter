# ADR-008: Tristate Conflict Detection for JSON Config Tasks

**Status:** Accepted  
**Date:** 2026-04-29

## Decision

Tasks that patch JSON config files (e.g., `strictTask` for `tsconfig.json`, `pathsTask` for `tsconfig.json`) shall use a **tristate detection pattern**:

| State | Condition | TaskStatus | Behavior |
|-------|-----------|------------|----------|
| **Missing** | Key does not exist in config | `patch` | Add the key with recommended value |
| **Match** | Key exists with expected value | `skip` | No changes needed |
| **Mismatch** | Key exists with different value | `conflict` | Do not overwrite; alert user |

## Rationale

The previous binary approach (present/absent) caused **permanent patch loops**:

1. Task detects `strict: false` → returns `patch`
2. Apply merges `strict: true` into config
3. But user explicitly set `strict: false`, so apply is a no-op or produces `strict: false` again
4. Next check still returns `patch` → infinite loop

Treating explicit mismatches as `conflict` prevents this loop and respects user overrides.

## Example: strictTask

```typescript
if (config.compilerOptions?.strict === true) return 'skip'
if (config.compilerOptions?.strict === false) return 'conflict'  // user explicitly disabled
return 'patch'  // key missing, add it
```

## Consequences

- Users who explicitly disable a feature get `conflict` instead of a silent no-op loop.
- Missing keys still get auto-populated with recommended values.
- Matching keys correctly skip without false positives.
