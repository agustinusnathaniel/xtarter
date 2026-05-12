---
'@xtarterize/core': minor
'@xtarterize/tasks': minor
---

feat: changeset-aware release workflow with smart node version detection

Release workflow task now detects changeset usage and generates the appropriate workflow (changesets/action@v1 for changeset projects, tag-push for others). Smart Node.js version detection from .nvmrc and package.json engines.node, applied to all workflow templates.
