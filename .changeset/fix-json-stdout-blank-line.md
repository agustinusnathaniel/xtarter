---
'xtarterize': patch
---

`add`, `init`, and `sync` no longer emit a leading blank line before the JSON payload in `--json`/`--format json` mode — stdout now contains exactly the machine-readable payload, as documented.
