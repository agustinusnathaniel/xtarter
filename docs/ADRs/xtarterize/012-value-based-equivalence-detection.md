# ADR-012: Value-Based Equivalence Detection for Tasks

**Status:** Accepted
**Date:** 2026-05-01

## Context

The original task system checked for equivalence by comparing **keys**: does `package.json` have a `typecheck` script? Does `tsconfig.json` have `compilerOptions.paths`? This missed real-world scenarios where:

1. **Same value, different key**: A project has `"type:check": "tsc --noEmit"` and xtarterize wants to add `"typecheck": "tsc --noEmit"` — same command, different name
2. **Same config, different format**: `"extends": "config:base"` vs `"extends": ["config:base"]` — semantically identical
3. **Line ending differences**: A template file has LF but the existing file has CRLF — content is identical

Previously, these cases produced `patch` or `conflict`, leading to redundant diffs or manual resolution prompts.

## Decision

Tasks shall detect equivalence at the **value/content level**, not just the key level. Three new helpers support this:

### 1. `hasScriptValue` (Package Scripts)

When checking if a script needs to be added, skip it if the **exact same command string** already exists under any script name:

```typescript
const missingScripts = scripts.filter(
  (s) => !hasOwnScript(scriptsMap, s.script) && !hasScriptValue(scriptsMap, s.value)
)
```

### 2. `normalizeExtends` (JSON Configs)

Normalize `"extends": "string"` to `"extends": ["string"]` before comparison, treating both forms as equivalent:

```typescript
normalizeExtends({ extends: "biome" })
// → { extends: ["biome"] }
```

### 3. `normalizeLineEndings` (Text Files)

Convert `\r\n` to `\n` before comparing file contents in `createSimpleFileTask`:

```typescript
if (normalizeLineEndings(actual.trim()) === normalizeLineEndings(expected.trim()))
  return 'skip'
```

### 4. Remove "conflict" for Script Mismatches

Previously, if `biome` existed with a different value (e.g., `"eslint ."`), the task returned `conflict`. Now it returns `patch` and only adds the **missing** scripts. Existing scripts are never overwritten.

## Rationale

- **Idempotency**: Running `xtarterize init` on an already-conformant project should truly produce zero changes
- **Respect user choices**: If a user renamed a script or used a different `extends` format, that's not a conflict
- **Real-world compatibility**: Projects evolve organically; strict key-matching is too brittle

## Consequences

- `createPackageJsonTask.check()` and `.dryRun()` now filter with `hasScriptValue`, not just `hasOwnScript`
- `biomeTask` and `renovateTask` use `normalizeExtends` before `deepEqual` comparison
- `createSimpleFileTask.check()` normalizes line endings before comparison
- Tasks that previously returned `conflict` for script mismatches now return `patch` (with only missing scripts added)
- Tests must be updated to expect `patch` + no-op diff instead of `conflict`
