# ADR-011: Deduplicating File Diffs in CLI Output

**Status:** Accepted
**Date:** 2026-05-01

## Context

Multiple independent tasks can target the same JSON file. For example:

- `ts/incremental` adds `compilerOptions.incremental`
- `ts/paths` adds `compilerOptions.paths`
- `ts/strict` adds `compilerOptions.strict`

Each task's `dryRun()` returns a separate `FileDiff` for `tsconfig.json`. When displayed individually, the user sees three overlapping diffs that rewrite the same file three times. This is confusing and doesn't represent the actual final state.

## Decision

The CLI (`diff` command and `runCommand` dry-run path) shall group `FileDiff[]` by `filepath` before display. For JSON files (`.json`, `.jsonc`, `.json5`), it merges the individual `after` values using `patchJson` to compute a single unified diff per file.

```typescript
function mergeFileDiffs(diffs: FileDiff[]): FileDiff[] {
  const grouped = groupByFilepath(diffs)
  for (const [filepath, list] of grouped) {
    if (isJsonFile(filepath)) {
      const before = findFirstNonNullBefore(list)
      let after = before ?? '{}'
      for (const diff of list) {
        after = patchJson(after, JSON.parse(diff.after))
      }
      merged.push({ filepath, before, after })
    } else {
      merged.push(list[list.length - 1]) // non-JSON: keep last
    }
  }
}
```

## Rationale

- **User clarity**: A single diff per file shows the complete intended state
- **Accurate representation**: The merged diff matches what `apply()` actually writes (tasks run sequentially, each patching the file left by the previous)
- **Non-breaking**: Only affects display; individual task logic remains unchanged

## Consequences

- `diff` and `init --dry-run` output is now consolidated per file
- Non-JSON files (e.g., `.github/workflows/ci.yml`) still show individual diffs since they don't share a merge strategy
- The merge order follows task execution order, which is deterministic
