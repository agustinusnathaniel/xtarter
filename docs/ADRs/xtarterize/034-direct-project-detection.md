# ADR 034: Direct Project Detection Without a Profile Cache

## Status

Accepted

## Date

2026-09-11

## Context

ADR 021 added a fingerprint-based cache for `detectProject()` stored at
`.xtarterize/cache/profile-fingerprint.json`. The cache was meant to skip
re-reading `package.json`, lockfiles, config files, and config directories on
repeated CLI invocations. ADR 021 estimated a full detection run at 50-150ms
and a cache hit at under 1ms, and ADR 032 later expanded the fingerprint and
validation logic (cache version 3).

Measurement during the production-reduction round did not reproduce those
numbers. A warm cache hit completed in about 2.2ms, while computing the profile
directly completed in about 1.3ms; the fingerprint stat calls, JSON read, and
validation cost more than the detection work they avoided for typical projects.
The cache also carried a dedicated module (`packages/core/src/detect/cache.ts`),
fingerprint and cache-entry types, cache versioning, malformed-entry
validation, and registry accessors used only for fingerprinting.

## Decision

Remove the profile cache and compute the `ProjectProfile` directly on every
invocation.

- `detectProject()` in `packages/core/src/detect.ts` runs detection directly;
  the former private `computeProjectProfile()` body becomes the function body.
- Delete `packages/core/src/detect/cache.ts`, the `ProfileCacheEntry` and
  fingerprint types, `PROFILE_CACHE_VERSION`, and the registry accessors that
  existed only for the fingerprint (`rootFileInputs`, `configDirInputs`,
  `cwdMarkerInputs`, `packageJsonInput`).
- The detection registry (ADR 032) remains the shared declaration for the
  keyed detector entries and the inputs consumed by detection helpers and
  doctor lockfile checks; it feeds those consumers and the `existing` profile
  keys without a fingerprint path.
- No `.xtarterize/cache/` directory is created.

Update (2026-09-11): ADR 032's follow-up reduced the registry to the keyed
detector entries and the inputs with a runtime consumer. The nine logic
detector declarations and six unused inputs were removed, so the registry no
longer declares every detection input or detector.

## Rationale

- Direct detection was faster than a warm cache hit in measurement (~1.3ms vs
  ~2.2ms), so the cache did not deliver its promised saving.
- Removing the cache removes an artifact, a storage format, a version, the
  validation code, and the stale or malformed entry failure modes.
- Detection stays deterministic and idempotent: every run observes the current
  inputs instead of trusting a stored snapshot.

## Alternatives Considered

1. **Keep the cache and lower its overhead.** Attempted in ADR 032 by
   validating every fingerprinted field; the remaining cost is inherent to
   stat-and-compare plus file I/O.
2. **In-memory cache only.** Does not persist across CLI invocations, so it
   cannot help the repeated-run case ADR 021 targeted.
3. **Content-hash cache.** More accurate than mtime plus size, but more
   expensive per input, moving further from the measured result.

## Consequences

### Positive

- Detection is simpler: one function, no cache module, no cache schema version.
- No `.xtarterize/cache/` artifact, so less I/O and less on-disk state.
- `.xtarterize/` is now limited to backups, the run manifest, and the
  skills-install log; the automatic gitignore rule from ADR 026 still applies
  to those artifacts.

### Negative

- Every invocation pays the full detection cost. In measurement this is
  ~1.3ms, so the lost cache optimization is small and bounded.

### Related Decisions

- ADR 021 (fingerprint profile caching) - superseded by this ADR.
- ADR 026 (automatic `.xtarterize/` gitignore) - the rule and its mechanics
  are unchanged for the remaining artifacts.
- ADR 032 (detection registry) - the registry outlived the cache; its
  2026-09-11 follow-up reduced it to the keyed detector entries and the inputs
  with a runtime consumer.
