---
'create-xtarter-app': patch
---

Import the plain core entry so Effect stays out of the scaffold bundle

`create-xtarter-app` now imports helpers from `@xtarterize/core/plain`, whose
import graph never reaches `effect`. The published bundle is smaller and
`effect` is no longer part of `inlinedDependencies`. Behavior is unchanged.
