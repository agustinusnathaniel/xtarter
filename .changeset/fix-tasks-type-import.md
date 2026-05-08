---
"@xtarterize/tasks": patch
---

Fix TypeScript build error for type imports

- Add `type` modifier to `PackageScriptsMap` import in `factory/index.ts`
- Fixes: `"PackageScriptsMap" is not exported` build error with tsdown/rolldown
