# ADR 034: Direct Project Detection Without a Profile Cache

## Status

Accepted

## Date

2026-09-11

## Context

ADR 021 added a fingerprint cache for project detection to skip re-reading package manifests, lockfiles, and config files on repeated invocations. It estimated that a warm cache hit would be far cheaper than computing the profile. Measurement during a production-reduction round did not reproduce that: a cache hit was slower than direct detection, because the fingerprint stat calls, JSON read, and validation cost more than the detection work they avoided. The cache also carried a module, cache-entry types, a version, malformed-entry validation, and registry accessors used only for fingerprinting.

## Decision

Remove the profile cache and compute the project profile directly on every invocation. No cache directory is created. The detection registry (ADR 032) stays as the shared declaration for the keyed detector entries and the inputs consumed by detection helpers and doctor lockfile checks.

## Rationale

- Direct detection measured at least as fast as a warm cache hit, so the cache did not deliver its promised saving.
- Removing the cache removes an artifact, a storage format, a version, the validation code, and the stale or malformed entry failure modes.
- Detection stays deterministic and idempotent: every run observes the current inputs instead of trusting a stored snapshot.

## Alternatives Considered

- **Keep the cache and lower its overhead.** Attempted in ADR 032; the remaining cost is inherent to stat-and-compare plus file I/O.
- **In-memory cache only.** Does not persist across CLI invocations, so it cannot help the repeated-run case ADR 021 targeted.
- **Content-hash cache.** More accurate than mtime plus size, but more expensive per input and further from the measured result.

## Consequences

### Positive

- Detection is one function with no cache module or schema version, no cache artifact on disk, and less I/O.

### Negative

- Every invocation pays the full detection cost, which measurement showed to be small; the cache optimization is lost.
