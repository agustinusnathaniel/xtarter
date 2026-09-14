---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Restore task search recall for related words

`query` and `init --compose` find tasks from related phrasings again: `typing`
reaches strict TypeScript, `updates` the dependency updater, and `code` the VS
Code task. Multi-word queries like `auto update` rank the exact phrase first.

A 33-query check went from 83 results (0.580 mean top-1 relevance) to 168
(0.834), near the 191 and 0.783 before 2.0.0. Alias hits are discounted; direct
hits win. See ADR 039. Patch: no command, dependency, or config change.
