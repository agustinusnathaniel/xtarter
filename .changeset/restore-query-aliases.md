---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Restore query recall with compact alias groups

`query` and `init --compose` expand query tokens through 17 compact alias
groups again. Expansion is bidirectional and single-hop within a group, alias
matches are discounted to 0.85 so a direct hit at the same tier ranks first,
and alias substring matches require meaningful containment (the shorter side is
at least 4 characters and at least half of the longer side). Four tasks gained
a keyword alias (`typing` on `ts/strict`, `versioning` on `release/versionrc`,
`updates` on `deps/renovate`, `hooks` on `release/git-hooks`).

Measured against a 33-query battery: results move from 83 back to 169 (main had
191) and mean top-1 relevance from 0.580 to 0.821 (main had 0.783). Zero-result
queries disappear, `code` ranks `editor/vscode` first again, `husky` returns 6
results, and `updates` scores 0.831.

This is not a revert of the transitive synonym map removed in 2.0.0: there is
no cross-group closure, the table is 17 groups and 44 lines instead of 92
lines, and alias matches are discounted rather than scored at full strength.
Recorded in ADR 039.

Patch: no dependency, config, or CLI contract change.
