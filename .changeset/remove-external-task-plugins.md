---
'@xtarterize/core': major
'xtarterize': major
---

Remove external task plugins and the Promise task contract

External task plugin loading is removed: the `plugins` key in `.xtarterizerc`,
`.xtarterizerc.json`, `.xtarterizerc.json5`, or the `"xtarterize"` key in
`package.json` is no longer read. Existing configs keep supporting `only` and
`skip` task selection with the same precedence rules.

`PromiseTask` and `EffectTask` collapse into a single Effect-only `Task`
interface. `toTaskEffect()` remains as the normalizer for synchronous and
Promise-returning spec functions at the task-factory seam, and built-in tasks
are unchanged.

**Breaking:** any project that configured `plugins` will no longer load those
task packages. Remove the `plugins` entries and use built-in tasks instead.
