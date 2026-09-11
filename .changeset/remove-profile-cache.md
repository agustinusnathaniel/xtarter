---
'@xtarterize/core': patch
'xtarterize': patch
---

Remove the detection profile cache and compute the profile directly

- `detectProject()` reads the detection registry inputs and computes a fresh `ProjectProfile` on every invocation; `packages/core/src/detect/cache.ts`, the fingerprint and cache-entry types, and `PROFILE_CACHE_VERSION` are removed.
- No `.xtarterize/cache/` directory is created; `.xtarterize/` now holds backups, the run manifest, and the skills-install log only.
- Measured, a warm cache hit (~2.2ms) was slower than direct detection (~1.3ms), so repeat runs are also faster.
