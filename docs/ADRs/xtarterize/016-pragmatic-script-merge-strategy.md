# ADR 016: Pragmatic Script Merge Strategy

## Status
Accepted

## Date
2026-05-08

## Context

When xtarterize adds scripts to package.json (like `biome`, `typecheck`, `test`, and composites like `check:turbo`), we need to:

1. Not duplicate scripts the project already has
2. Respect the project's existing script naming conventions
3. Build composite scripts using existing script references when possible

### Problems with previous approaches

1. **Hardcoded aliases**: brittle, project-specific assumptions about what aliases exist
2. **Tool-based equivalence only**: too aggressive on similar tools, misses semantic meaning
3. **Ignore project's conventions**: forces our script keys even when project has better names

## Decision

We use a **project-first, pragmatic approach**:

### 1. Scan existing scripts first

When `packageScriptsTask` evaluates what to add, it reads the project's existing scripts and categorizes them:

- Which scripts exist that match tools we want to add (biome, tsc, vitest, etc.)
- What keys are used (project's naming conventions)

### 2. Skip duplicates with smart detection

A script is considered "already exists" when:
- **Exact match**: same command under any key
- **Same tool**: e.g., existing `lint: "biome check ."` matches proposed `biome: "biome check ."`
- **Same script reference**: e.g., existing `npm run build` matches proposed `build: "turbo run build"`

### 3. Build composites from existing references

When constructing `check:turbo`:
- If project already has `lint`, `typecheck`, `test` scripts → use those: `turbo run lint typecheck test`
- Only add missing individual scripts, then reference them all

### 4. Two strategies for conflict resolution

When overlap exists, we can either:
- **Keep project conventions**: Use project's script keys in composite
- **Normalize to our standards**: Rename to our preferred keys (optional, future feature)

Currently we use strategy 1 (keep project conventions).

## Implementation

### Key changes in `packages/tasks/src/factory-package-json.ts`

1. `getScripts()` now reads existing package.json and determines which script keys to reference
2. For composite scripts like `check:turbo`, we dynamically construct task list from existing scripts
3. Individual scripts are only added if no equivalent exists

### Script equivalence detection

```typescript
// Command equivalence logic
function commandsEquivalent(a: string, b: string): boolean {
  // Exact match
  if (normalize(a) === normalize(b)) return true

  // Same tool (for simple tools like biome, eslint, tsc)
  if (extractTool(a) === extractTool(b)) return true

  // Same script reference (pnpm run X, npm run X)
  if (extractScriptRef(a) === extractScriptRef(b)) return true

  // Same composite tasks (turbo run X Y)
  if (bothTurbo && extractTurboTasks(a) === extractTurboTasks(b)) return true

  return false
}
```

## Consequences

### Positive
- ✅ No duplicate scripts added
- ✅ Respects project's naming conventions
- ✅ Composites reference existing scripts when available
- ✅ More predictable behavior - project conventions win

### Negative
- ⚠️ More complex logic in getScripts()
- ⚠️ Need to read existing package.json during script generation
- ⚠️ check:turbo might have different task order than expected

### Future enhancements
- Add `--force-key` option to normalize to our standards
- Warn when composite references differ from recommended
- Support custom composite script templates