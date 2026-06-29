# ADR 021: Fingerprint-based Profile Caching

## Status
Accepted

## Date
2026-05-26

## Context

`detectProject(cwd)` is called fresh on every CLI invocation (`init`, `check`, `sync`, `diff`, `list`, `add`). It re-reads `package.json`, stat-checks a dozen config files, detects lockfiles, and inspects git/config directories — all from scratch each time.

For a single project this is fast (~50-150ms). But on re-runs it's wasted I/O. In CI pipelines or during interactive use (e.g., running `check` after `sync`), the same inputs produce the same profile, yet the work repeats identically.

The project was already using Effect TS v4 for structured concurrency and typed error handling (ADR 019), so any caching solution should integrate with that pattern.

## Decision

Add a **fingerprint-based cache** for `detectProject()` that skips re-detection when no relevant inputs have changed.

### Cache key

The fingerprint covers all inputs that affect the profile:

| Component | Fields | Rationale |
|-----------|--------|-----------|
| `package.json` | path, mtimeMs, size | Dep changes, version bumps |
| Lockfile | path, mtimeMs, size | Dep install/update |
| Config dirs | path, mtimeMs, size per file (recursive, sorted) | `.github/`, `.vscode/`, `.changeset/` |

We use **mtime + size** instead of content hashing because:
- stat() is ~1 syscall vs reading+digesting the full file
- False positives (mtime changes without content change) are rare and only trigger a re-compute — no correctness risk
- Config directory contents are fingerprinted recursively — each file's mtimeMs and size are recorded in a sorted list. This detects file additions, removals, and content modifications within config directories.

### Cache storage

**Location:** `.xtarterize/cache/profile-fingerprint.json` (project-local, predictable)

**Storage format:**
```typescript
interface ProfileCacheEntry {
  version: 1
  fingerprint: ProjectFingerprint
  profile: ProjectProfile
  computedAt: string  // ISO timestamp
  durationMs: number  // how long detection took
}
```

**Write strategy:** Atomic write via temp-then-rename (same pattern as backup index in `backup.ts`) to prevent partial reads from concurrent invocations.

### Invalidation rules

Cache is invalidated if **any** fingerprint field changes:
1. `package.json` mtime or size changes
2. Lockfile mtime or size changes (or lockfile appears/disappears)
3. Config directory mtime changes (file added/removed from `.github/`, `.vscode/`, `.changeset/`)
4. Cache version doesn't match
5. Cache file is missing or corrupt (JSON parse fails → fall through to compute)

Cache does **not** depend on git HEAD — the profile is determined by deps and configs, not code content.

### Error handling (best-effort)

Cache I/O uses the **boundary pattern** from ADR 019:
- Internal: `Effect.tryPromise` with `FileSystemError` + `Effect.orElseSucceed` fallback
- Public: `Effect.runPromise` at function boundary, returning `Promise<T>`
- All cache errors (read, write, parse) are silently handled — the system falls through to full re-computation

This means the cache is **always optional** — a corrupt or missing cache file never causes detection to fail.

### Integration point

```typescript
export async function detectProject(cwd: string): Promise<ProjectProfile> {
  const fingerprint = await computeFingerprint(cwd)
  const cached = await readProfileCache(cwd)
  if (cached && isCacheValid(cached, fingerprint)) {
    return cached.profile
  }
  const profile = await computeProjectProfile(cwd)
  await writeProfileCache(cwd, { version: 1, fingerprint, profile, ... })
  return profile
}
```

The original detection body was extracted into `computeProjectProfile()` as a private function.

## Rationale

- **Performance:** Cache hit is <1ms vs 50-150ms for full detection
- **Simplicity:** mtime+size is cheaper than content hashing, and false positives are harmless
- **No correctness risk:** Cache mis-match always triggers re-computation; we never return stale data
- **Fits existing patterns:** Uses Effect boundary pattern (ADR 019), atomic write (same as backup.ts), and project-local `.xtarterize/` dir

## Alternatives Considered

1. **No caching (status quo):** Simple but wasteful on re-runs
2. **Content hashing (SHA-256 of package.json + lockfile):** More accurate but adds ~5ms per stat'd file for digesting
3. **Git-based key (HEAD sha):** Too coarse — dep changes between commits aren't captured, and non-git projects wouldn't benefit
4. **In-memory cache only:** Doesn't persist across CLI invocations

## Consequences

### Positive
- ✅ Cache hit: <1ms vs 50-150ms for full detection
- ✅ Best-effort: corrupt/missing cache never breaks detection
- ✅ Follows ADR-019 Effect boundary pattern
- ✅ Atomic writes prevent partial reads from concurrent processes
- ✅ Gitignored fixture cache artifacts in test setup

### Negative
- ⚠️ Adds `.xtarterize/cache/` directory to projects (gitignored if `.xtarterize/` is in root `.gitignore`)
- ⚠️ mtime comparisons can produce false positives on some filesystems (e.g., NFS, CI clone) — harmless but triggers unnecessary re-computation
- ⚠️ Resolved in implementation: recursive per-file fingerprinting now detects content changes. See `fingerprintConfigDirs()` in `cache.ts`.
