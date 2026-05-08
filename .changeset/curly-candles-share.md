---
"xtarterize": patch
---

Refactor internal architecture by deepening module seams in project detection and task execution.

- modularize core detection into focused adapters (framework, bundler, router, styling, package manager, monorepo)
- centralize JSON config mutation flow in shared task helpers
- consolidate agent task behavior behind a dedicated agent module seam

These changes improve maintainability, testability, and consistency without changing end-user CLI behavior.
