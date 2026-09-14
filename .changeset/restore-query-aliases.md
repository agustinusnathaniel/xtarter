---
'@xtarterize/core': patch
'@xtarterize/tasks': patch
'xtarterize': patch
---

Restore task search recall for related words

`query` and `init --compose` find tasks from related phrasings again. Searches
for `typing` reach the TypeScript strict task, `updates` reaches the dependency
updater, `husky` and `commitlint` return the git hook tasks, and `code` leads
with the VS Code task. Multi-word queries like `auto update` and `npm scripts`
rank the task that owns that exact phrase first.

A 33-query check went from 83 results and 0.580 mean top-1 relevance before
this change to 168 results and 0.834, close to the 191 results and 0.783 the
search returned before 2.0.0 removed synonym expansion. Tokenization,
stemming, fuzzy, prefix, and substring matching are unchanged; expansion now
comes from a small alias list, a direct match at the same tier always outranks
an alias match, and approximate alias matches are discounted. Recorded in
ADR 039.

Patch: the command surface is unchanged and no dependency or config format
moved.
