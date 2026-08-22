---
'@xtarterize/tasks': patch
---

quality/package-engines now derives the devEngines Node floor from the project's detected Node version (.nvmrc, engines.node, or CLI default) instead of hardcoding >=24, keeping devEngines consistent with the Node version installed by generated CI workflows.
