---
"xtarterize": patch
---

docs: sync README task categories and commands with source, fix monorepo structure and package tables

README Task Categories now lists all 13 groups (Linting & Formatting with Biome/Oxlint/Oxfmt, TypeScript with paths/tsbuildinfo, Release with versionrc/git-hooks, Quality with lint-staged/package-engines, Agent with skills-install, Scripts with .npmrc, Workspace with pnpm-workspace). Commands table adds missing query and doctor entries derived from defineCommand meta and corrects descriptions to match source. Monorepo diagram and Packages table add @xtarter/create and @xtarter/docs. AGENTS.md Quick Reference and workflow step add xtarter-create and docs to match pnpm-workspace.yaml apps/*.
