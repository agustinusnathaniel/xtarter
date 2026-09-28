---
'create-xtarter-app': patch
---

Scaffolding no longer leaves a half-initialized `.git` behind when the initial
commit fails. The repository directory is removed when scaffolding created it,
and a pre-existing `.git` is never touched.
