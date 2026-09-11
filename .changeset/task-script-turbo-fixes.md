---
'@xtarterize/patchers': patch
'@xtarterize/tasks': patch
---

Fix script equivalence, Turbo detection, and patcher exports

- `turborepo run` is no longer treated as equivalent to `turbo run`; composite equivalence requires an extractable task list.
- Non-string script values in `package.json` are ignored instead of being coerced.
- Turbo detection checks both `dependencies` and `devDependencies`, and `check:turbo` recognizes renamed `typecheck`/`test` scripts through tool mapping.
- `@xtarterize/patchers` drops the unused `beforeCode` field and the `InjectVitePluginOptions`/`InjectVitePluginResult` type exports from its entry point.
