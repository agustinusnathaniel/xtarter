---
'@xtarterize/tasks': patch
'xtarterize': patch
'create-xtarter-app': patch
---

Trim repeated task and CLI plumbing without changing generated output

- The skill catalog groups entries behind `skillsFor`/`alwaysSkills`; the expanded catalog, entry order, sources, and conditions are unchanged.
- `readPackageJson` is imported from core directly instead of a pass-through wrapper, and the skills task uses one static `node:fs/promises` import.
- CLI commands report outcomes through `CommandSession.reportOutcome`, and interactive `add` executes its confirmed selection through `session.apply`; messages, exit codes, backups, and manifests are unchanged.
- `create-xtarter-app` inlines its JSON result formatting, and merged diffs use core's `isJsonFile` predicate.
