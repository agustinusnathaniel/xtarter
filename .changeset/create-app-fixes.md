---
"create-xtarter-app": patch
---

Edge-case fixes for project scaffolding:

- Windows-compatible path handling (use `basename()` instead of `split('/')`)
- Fixed pnpm overrides crash with type-check before `.includes()` call
- Async `readdir` from `fs/promises` replaces sync `readdirSync`
- Improved project name sanitization (collapse consecutive hyphens, trim leading/trailing)
- Handle explicit `false` values from CLI flags in prompt functions
- Runtime validation of `packageManager` in `installDependencies`
- Removed dead code referencing already-deleted `.github` directory
