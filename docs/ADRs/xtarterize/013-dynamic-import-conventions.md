# ADR-013: Dynamic Import Conventions

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The codebase uses both static `import` and dynamic `await import()` in ESM modules. Contributors occasionally ask why one is chosen over the other in specific locations. We need a clear, documented convention to keep the decision consistent and reviewable.

## Decision

Use **dynamic `await import()`** only in these two situations. Use static `import` everywhere else.

### 1. Conditional / lazy loading of expensive or rarely used dependencies

When a module is only needed on a code path that may not execute, dynamically import it at the point of use. This avoids loading and parsing the module at startup when the feature is not exercised.

**Example — `magicast` in Vite plugin tasks:**

```ts
// packages/tasks/src/factory.ts
async dryRun(cwd, _profile): Promise<FileDiff[]> {
  // magicast is heavy and only needed for Vite plugin injection
  const { generateCode, loadFile, parseExpression } = await import('magicast')
  // ...
}
```

`magicast` is an AST manipulation library with a large dependency tree. Most projects don't use Vite, so eagerly loading it would add unnecessary startup cost.

### 2. Built-in Node.js modules used only in conditional branches

When a built-in module is used in a helper function that may short-circuit before reaching the import, dynamically import it at the point of use. Built-ins have negligible load cost, but this keeps the top-level import section focused on universally used dependencies.

**Example — `node:fs/promises` in directory scanning:**

```ts
// packages/core/src/detect.ts
async function detectGitHubWorkflows(cwd: string): Promise<string[]> {
  const workflowsDir = resolvePath(cwd, '.github', 'workflows')
  const exists = await fileExists(workflowsDir)
  if (!exists) return []

  // readdir is only needed when .github/workflows exists
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(workflowsDir)
  // ...
}
```

**Not valid reasons to use dynamic import:**

- **Circular dependency avoidance** — the package graph (ADR-002) is acyclic. If you think you need dynamic import to break a cycle, the fix is restructuring the dependency graph, not hiding it.
- **Workspace package imports** — packages like `@xtarterize/core` should be imported statically at the top of the file. Do not dynamically import your own workspace dependencies unless you have a documented performance or bundling reason.

## Anti-pattern example

```ts
// BAD — already imported statically at the top of the file
import { readJsonIfExists } from '@xtarterize/core'

async function checkFn(cwd) {
  // Redundant dynamic import of the same package
  const { readPackageJson } = await import('@xtarterize/core')
  // ...
}
```

In this case both utilities should be static imports:

```ts
// GOOD
import { readJsonIfExists, readPackageJson } from '@xtarterize/core'
```

## Rationale

- Static imports are easier to analyze (tree-shaking, IDE navigation, dependency graphs)
- Dynamic imports add async overhead and make the control flow harder to follow
- The two valid use cases above provide measurable value (startup time / memory) that justifies the trade-off

## Consequences

- Code reviewers should flag dynamic imports that don't fit the two valid use cases
- Existing dynamic imports that violate this convention should be refactored to static imports when touched
- This ADR supersedes any ad-hoc decisions made in individual files
