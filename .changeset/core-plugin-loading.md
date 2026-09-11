---
'@xtarterize/core': patch
---

Simplify plugin loading and session config reads

- A plugin import that fails or exceeds the 10s load timeout is still warned and skipped without failing the command.
- `.xtarterizerc` (or the `package.json` `xtarterize` key) is read once per session and shared by task selection and plugin loading.
