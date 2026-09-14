# ADR 021: Fingerprint-based Profile Caching

## Status

Superseded

Superseded by [ADR 034](034-direct-project-detection.md).

## Date

2026-05-26

## Decision

Cache project-detection results keyed by a fingerprint of `package.json`, lockfile, and config-file mtimes and sizes, stored project-locally, with any mismatch or I/O failure falling back to full detection.

ADR 034 removed the cache: direct detection measured faster than a warm cache hit, so the artifact, storage format, and validation code were not worth keeping.
