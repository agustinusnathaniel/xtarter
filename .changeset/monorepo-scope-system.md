---
'@xtarterize/core': patch
'@xtarterize/patchers': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Refactor task resolution with TaskScope system for monorepo-aware task filtering

Introduces a `TaskScope` type (`'root' | 'package' | 'both'`) that each task can declare. When running in a monorepo:

- **Root-scoped tasks** (CI/CD, release tooling, turbo, renovate, editor config, npmrc, gitignore, package scripts) are excluded when running inside a workspace package.
- **Package-scoped tasks** (tsconfig path aliases, vite-plugin-checker, rollup-plugin-visualizer) are excluded when running from the monorepo root.
- Tasks without explicit scope (or with `scope: 'both'`) are included everywhere, preserving backward compatibility.

Also fixes runtime detection so Node.js projects using Vite for build orchestration are correctly identified as `runtime: 'node'` instead of `runtime: 'browser'`.
