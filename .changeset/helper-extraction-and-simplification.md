---
"@xtarterize/core": patch
"@xtarterize/patchers": patch
"@xtarterize/tasks": patch
"xtarterize": patch
"@xtarter/create": patch
---

Extract shared helper functions (createSetupSteps, getCompilerOptions, computePackageJsonChanges, computeFileDiffs, resolveProjectLintConfig) to eliminate factory workflow duplication. Simplify create-xtarter-app CLI with reusable helpers. Deduplicate isRecord/isStringRecord type guards. Simplify bundler detection in core.
