---
'@xtarterize/tasks': patch
'xtarterize': patch
'create-xtarter-app': patch
---

Remove redundant default values from biome.json and .oxfmtrc.json templates (formatter.enabled, linter.enabled, semicolons, trailingComma, etc.)

Add type-safe config interfaces: generated Configuration type from @biomejs/biome schema, upstream OxlintConfig/OxlintEnv types, and local OxfmtConfig type

Switch commitlint.config.ts output from JSDoc @type to import type { UserConfig }
