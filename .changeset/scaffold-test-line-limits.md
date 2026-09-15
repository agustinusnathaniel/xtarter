---
'@xtarterize/tasks': patch
---

Enforce function line limits in scaffolded test files

The generated `biome.json` no longer disables
`complexity/noExcessiveLinesPerFunction` for test globs, so `*.test.*` and
`*.spec.*` files in newly conformed projects follow the same 60-line function
limit as source. Split long `describe` callbacks into sequential same-name
blocks or hoist shared fixtures to module scope if `check` flags existing
specs.
