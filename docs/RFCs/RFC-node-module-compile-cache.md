# RFC: Node.js `module.compileCache` for xtarterize

**Status:** Proposed
**Date:** 2026-07-07

## Summary

Node.js `module.compileCache` persists compiled bytecode to disk so later runs skip re-parsing modules, which shortens startup for module-heavy CLIs. This RFC evaluates whether xtarterize should enable it.

## Recommendation

Defer. The repository now targets a Node.js version that supports the feature, so the original version-mismatch objection no longer applies. The deferral holds on two other grounds:

- xtarterize runs a handful of times per project setup, so even a large startup improvement saves fractions of a second in practice.
- Cold-start cost is dominated by file I/O and subprocess calls, not module compilation.

Approaches considered: enable the cache at the CLI entry point, recommend the related environment variable in generated CI workflows, or defer. Enabling the cache later is a one-line change; whether generated CI workflows should recommend it to the projects xtarterize configures is a separate decision.

## References

- [Node.js `module.compileCache` documentation](https://nodejs.org/api/module.html#module-compile-cache)
- [Benchmark thread by @jiahan_c](https://x.com/jiahan_c/status/2074069028520464497)
