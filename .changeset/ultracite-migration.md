---
"@xtarterize/tasks": minor
"@xtarterize/core": patch
"xtarterize": minor
---

feat: migrate monorepo linting to Ultracite with strict assist import groups

- Root biome.json now extends `ultracite/biome/core` with exact assist `organizeImports` groups per migration spec, vcs enabled, formatter indentStyle space, and monorepo-aware files includes
- Root package.json scripts `check` -> `ultracite check` and `fix` -> `ultracite fix`, devDeps include `ultracite` + `@biomejs/biome`
- turbo.json adds root tasks `//#check` and `//#fix` with cache false for `fix` per monorepo docs
- .vscode/settings.json updated to Ultracite's Biome universal config (biome formatter per language, organizeImports on save)
- AI integration: AGENTS.md appended with Ultracite Code Standards, .claude/CLAUDE.md and .claude/settings.json hook (`pnpm run fix --skip=correctness/noUnusedImports`) via `ultracite init --agents universal claude opencode --hooks claude`
- Idempotent: `ultracite doctor` passes, `renderBiomeJson` template already contains required assist groups byte-for-byte
