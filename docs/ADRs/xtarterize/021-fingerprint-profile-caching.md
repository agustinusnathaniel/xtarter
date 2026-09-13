# ADR 021: Fingerprint-based Profile Caching

## Status

Superseded

Superseded by [ADR 034](034-direct-project-detection.md).

## Date

2026-05-26

## Context

`detectProject(cwd)` was called fresh on every CLI invocation (`init`, `check`,
`sync`, `diff`, `list`, `add`), re-reading `package.json`, config files,
lockfiles, and git/config directories. That is fast for a single project
(~50-150ms) but repeats identical work on re-runs with unchanged inputs. The
project already used Effect TS v4 for structured concurrency and typed errors
(ADR 019), so caching should follow that pattern.

## Decision

Add a **fingerprint-based cache** for `detectProject()` that skips re-detection when no relevant inputs have changed.

### Cache key

The fingerprint covers all inputs that affect the profile:

| Component         | Fields                                    | Rationale                                                        |
| ----------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `package.json`    | path, mtimeMs, size                       | Dep changes, version bumps                                       |
| Lockfile          | path, mtimeMs, size                       | Dep install/update                                               |
| Config dirs       | path, mtimeMs, size per file (recursive)  | `.github/`, `.vscode/`, `.changeset/`                            |
| Root inputs       | path, mtimeMs, size per file              | Detector configs at cwd: `tsconfig`, `vite.config`, monorepo markers, `.nvmrc`, ... |
| Ancestor inputs   | path, presence per marker/dir             | Monorepo markers + `packages`/`apps`/`.git` walked upward from a nested cwd |

We use **mtime + size** instead of content hashing because:

- stat() is ~1 syscall vs reading+digesting the full file
- False positives (mtime changes without content change) are rare and only trigger a re-compute - no correctness risk
- Config directory contents are fingerprinted recursively - each file's mtimeMs and size are recorded in a sorted list. This detects file additions, removals, and content modifications within config directories.

### Cache storage

**Location:** `.xtarterize/cache/profile-fingerprint.json` (project-local,
predictable)

**Format:** `{ version: 2, fingerprint, profile, computedAt, durationMs }`.

**Write strategy:** Atomic write via temp-then-rename (same pattern as the
backup index in `backup.ts`) to prevent partial reads from concurrent
invocations.

### Invalidation rules

Cache is invalidated if **any** fingerprint field changes:

1. `package.json` mtime or size changes
2. Lockfile mtime or size changes (or the lockfile appears/disappears)
3. Config directory mtime changes (file added/removed in `.github/`,
   `.vscode/`, `.changeset/`)
4. Root input files change (detector configs at cwd: `tsconfig`,
   `vite.config`, monorepo markers, `.nvmrc`, ...)
5. Ancestor inputs change (monorepo markers, `packages`/`apps` dirs, or `.git`
   appearing/disappearing in any ancestor walked by `detectMonorepo`)
6. Cache version doesn't match
7. Cache file is missing or corrupt (JSON parse fails -> fall through to
   compute)

Cache does **not** depend on git HEAD - the profile is determined by deps and
configs, not code content.

### Error handling (best-effort)

Cache I/O used the boundary pattern from ADR 019: `Effect.tryPromise` with
`FileSystemError` + `Effect.orElseSucceed` internally, unwrapped to
`Promise<T>` at the function boundary. All read, write, and parse errors fall
through to full re-computation, so the cache is **always optional**.

### Integration point

`detectProject(cwd)` computes the fingerprint, returns `cached.profile` when
`isCacheValid` passes, and otherwise calls `computeProjectProfile()` (the
extracted original detection body) and writes the cache entry.

## Rationale

- **Performance:** Cache hit is <1ms vs 50-150ms for full detection
- **Simplicity:** mtime+size is cheaper than content hashing, and false positives are harmless
- **No correctness risk:** Cache mis-match always triggers re-computation; we never return stale data
- **Fits existing patterns:** Uses Effect boundary pattern (ADR 019), atomic write (same as backup.ts), and project-local `.xtarterize/` dir

## Alternatives Considered

1. **No caching (status quo):** Simple but wasteful on re-runs
2. **Content hashing (SHA-256 of package.json + lockfile):** More accurate but adds ~5ms per stat'd file for digesting
3. **Git-based key (HEAD sha):** Too coarse - dep changes between commits aren't captured, and non-git projects wouldn't benefit
4. **In-memory cache only:** Doesn't persist across CLI invocations

## Consequences

### Positive

- Cache hit <1ms vs 50-150ms for full detection.
- Best-effort: corrupt or missing cache never breaks detection, and atomic
  writes prevent partial reads from concurrent processes.
- Gitignored fixture cache artifacts in test setup.

### Negative

- Adds `.xtarterize/cache/` to projects (gitignored when the root
  `.gitignore` has the entry); mtime comparisons can false-positive on some
  filesystems (NFS, CI clones) and trigger unnecessary re-computation.
- Resolved in implementation: recursive per-file fingerprinting detects content
  changes in config dirs (`fingerprintConfigDirs()` in `cache.ts`).
