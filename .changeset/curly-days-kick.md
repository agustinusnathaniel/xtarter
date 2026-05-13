---
"@xtarterize/core": minor
"@xtarterize/tasks": minor
---

feat: add oxlint and oxfmt support with Vite+ auto-detection

When Vite+ is detected, xtarterize now configures oxlint/oxfmt (via `vp`) instead of Biome as the default linting/formatting stack:

- **Scripts**: `vp lint` / `vp check` / `vp check --fix` for Vite+ projects (instead of `biome check .` / `biome check --write .`)
- **Config**: `.oxlintrc.json` (with `consistent-type-imports`, `import/order`, `no-console` rules) and `.oxfmtrc.json` for Vite+ projects
- **Standalone oxlint**: Direct `oxlint`/`oxfmt` commands when oxlint/oxfmt config exists without Vite+
- **ESLint detection**: Existing ESLint setups are preserved — no lint tasks are applied
- **CI**: Single `vp check` step for Vite+ projects (handles fmt + lint + typecheck)
- **Lint-staged**: Skipped for Vite+ projects (uses `vp staged` via git hooks)
- **Biome**: Config still generated for IDE fallback, but scripts point to `vp` when Vite+ is present
