# RFC: Node.js `module.compileCache` for xtarterize

**Status:** Proposed  
**Date:** 2026-07-07

## Summary

Node.js `module.compileCache` persists V8 code cache to disk, enabling faster warm starts by skipping re-parsing of already-compiled modules. This RFC evaluates whether and how xtarterize should use it.

## Background

- `module.compileCache` was added in Node.js v22.1.0 and marked stable in v25.4.0
- It works via `module.enableCompileCache()` or the `NODE_COMPILE_CACHE=dir` environment variable
- Benchmarks from the Node.js team show meaningful improvements - e.g., a ~40% startup time reduction (130ms → 80ms) for a TypeScript CLI tool (@jiahan_c, July 2026)

## Motivation

xtarterize is a CLI tool that loads many modules on every invocation: the detection engine, task system, patchers, template renderers, and CLI framework. Each invocation re-parses and re-compiles all of these modules from scratch. If compiled bytecode could be cached and reused across invocations, cold start latency would drop noticeably.

## Considered Approaches

### Approach 1: Add `module.enableCompileCache()` at the entry point

Add a one-liner in `apps/xtarterize/src/index.ts`:

```ts
module.enableCompileCache();
```

| Pro                                             | Con                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Zero complexity impact - single line            | Requires Node.js v22.1+ (current minimum is Node 20)                                   |
| Fails silently on old Node or permission issues | xtarterize runs infrequently (project setup tool), so per-invocation savings are small |
| No dependencies or config changes               | Real bottlenecks are file I/O and subprocess spawns, not JS compilation                |

### Approach 2: Add to generated CI configs

xtarterize generates GitHub Actions workflows that currently target Node 20. We could add `NODE_COMPILE_CACHE=1` as a recommendation in generated CI workflow templates.

| Pro                                     | Con                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| CI runs frequently, so savings compound | Out of scope - xtarterize configures _linting and type checking_, not Node runtime settings |
| No version requirement change           | Generated workflows already target Node 20, which doesn't support the feature               |
| Easy to document as a best practice     | Upstream dependency (the projects xtarterize configures) would need to opt in               |

### Approach 3: Do nothing now, defer

Document this as a TODO item for when Node.js 22+ becomes the minimum target.

| Pro                                                                    | Con                                    |
| ---------------------------------------------------------------------- | -------------------------------------- |
| Zero work now                                                          | Nothing changes until the target bumps |
| The change is trivial when the time comes                              |                                        |
| Avoids configuring a feature that would be dead code for Node 20 users |                                        |

## Recommendation

**Defer (Approach 3).** Three reasons:

1. **Version mismatch.** xtarterize's current minimum engine target is Node 20. `module.compileCache` requires v22.1+. Supporting it now would mean either dropping Node 20 or adding conditional branching - neither is worth it for a per-invocation speedup on a tool that runs once per project setup.
2. **Infrequent execution.** Unlike a dev server or build watcher that runs hundreds of times a day, xtarterize is invoked a handful of times per project. Even a 40% startup improvement would save fractions of a second in practice.
3. **Wrong bottleneck.** xtarterize's cold-start cost is dominated by file I/O (scanning the project directory, reading config files, writing templates) and subprocess calls (installing packages). Module compilation is a minor contributor.

## Action Items

- [ ] When Node.js 22 becomes the minimum engine target, add `module.enableCompileCache()` to `apps/xtarterize/src/index.ts` before the `runMain(main)` call
- [ ] Consider adding `NODE_COMPILE_CACHE=1` to generated CI workflow templates as a best practice for the _projects_ xtarterize configures (separate decision, tracked independently)

## References

- [Node.js `module.compileCache` documentation](https://nodejs.org/api/module.html#module-compile-cache)
- [Benchmark tweet by @jiahan_c](https://x.com/jiahan_c/status/2074069028520464497)
