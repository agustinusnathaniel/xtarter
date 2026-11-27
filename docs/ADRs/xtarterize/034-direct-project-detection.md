# ADR 034: Detection Reads Its Inputs Directly

## Status

Accepted

## Date

2026-09-11

## Context

Two layers once sat in front of project detection. A fingerprint cache (ADR 021) skipped re-reading manifests, lockfiles, and config files on repeated runs. A detection registry (ADR 032) declared those inputs once, because detection, fingerprinting, diagnostics, and cache validation each re-listed them and the lists had drifted. Measurement then showed a warm cache hit was slower than detecting directly: the fingerprint stats, JSON read, and validation cost more than the work they skipped. With the cache gone, each registry list had a single reader. This record absorbs ADR 041, which removed the registry.

## Decision

- Compute the project profile directly on every invocation. No cache is written.
- Detection declares its inputs as plain constants next to the code that reads them. A list with two readers, such as the lockfile names shared by package-manager detection and the doctor check, is a constant shared from the module that owns it.
- The profile records only facts something reads. Unread existence keys and the unused framework version were dropped, along with their filesystem probes.

## Rationale

- Direct detection measured at least as fast as a warm cache hit, so the cache never delivered its saving, while it carried a storage format, a version, validation, and stale-entry failure modes.
- The drift the registry fixed came from many consumers re-listing the same inputs. With one consumer per list, a declaration layer adds indirection and prevents nothing.
- Every run observes current inputs, which keeps detection deterministic.

## Alternatives Considered

- **Keep the cache and lower its overhead.** Attempted; the remaining cost is inherent to stat-and-compare plus file reads.
- **An in-memory or content-hash cache.** In-memory cannot help across CLI invocations, and hashing costs more per input than the measured detection.
- **Keep the registry and drop only the unread keys.** Keeps builders, ids, and selectors for lists with one reader each.

## Consequences

- Every invocation pays the full detection cost, which measurement showed to be small.
- Adding an existence check means adding a field to the profile type and a probe to detection; the type keeps them in step.
