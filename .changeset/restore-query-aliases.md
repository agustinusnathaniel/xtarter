---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Restore query recall with compact alias groups

`query` and `init --compose` expand query tokens through 18 compact alias
groups again. Expansion is bidirectional and single-hop within a group, alias
matches are discounted to 0.85 so a direct hit at the same tier ranks first,
and alias-derived substring matches require meaningful containment (the
shorter side is at least 4 characters and at least half of the longer side).
A multi-word query that exactly matches an authored keyword is promoted to a
reserved score above alias-stacked token paths, so `auto update` ranks
`ci/auto-update` first. Four tasks gained a keyword alias (`typing` on
`ts/strict`, `versioning` on `release/versionrc`, `updates` on
`deps/renovate`, and `hooks` on `release/git-hooks`).

The 33-query battery measures both sides directly. Current main before this
change: 83 results and 0.580 mean top-1 relevance. This branch: 168 results
and 0.834 mean top-1 relevance. The pre-removal baseline (commit 6eac520) was
191 results and 0.783 mean top-1 relevance. Zero-result queries disappear,
`code` ranks `editor/vscode` first again, `husky` returns 6 results, and
`updates` scores 0.831.

This is not a revert of the transitive synonym map removed in 2.0.0: there is
no cross-group closure, the table is 18 groups and 45 lines instead of 92
lines, and alias matches are discounted rather than scored at full strength.
Recorded in ADR 039.

Patch: no dependency, config, or CLI contract change.
