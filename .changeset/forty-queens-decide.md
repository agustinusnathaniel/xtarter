---
'@xtarterize/tasks': minor
---

refactor: extract shared YAML workflow step builder with typed step objects and automated indentation; migrate CI, release, and auto-update workflow templates to use shared helpers

fix: replace npm-check-updates with native package manager update commands (pnpm update / npm update / yarn upgrade) followed by dedupe in the auto-update workflow
