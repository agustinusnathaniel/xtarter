---
"@xtarterize/core": patch
"@xtarterize/patchers": patch
"@xtarterize/tasks": patch
"xtarterize": patch
---

New `mergeYaml` / `parseYaml` public exports in `@xtarterize/patchers` for YAML config merging. Plugin specifier validation to prevent arbitrary code execution from malicious `.xtarterizerc` entries. `installDependency` now throws on failure instead of silently logging warnings.
