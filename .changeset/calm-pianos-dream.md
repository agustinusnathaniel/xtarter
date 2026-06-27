---
"@xtarterize/core": patch
"@xtarterize/patchers": patch
"@xtarterize/tasks": patch
"xtarterize": patch
---

fix: correct broken skill references in agent skill catalog
fix: git hooks now work on npm, yarn, and bun package managers
fix: engines.node raised to >=24 for clear error on unsupported Node versions
fix: resolve backup filename collision that could cause silent data loss
fix: add path traversal validation to backup restore for security hardening
fix: align Vite plugin dryRun output with apply output for reliable diffs
fix: improve detection cache fingerprint to detect config file changes
