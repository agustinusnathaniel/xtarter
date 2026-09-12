---
'@xtarterize/core': patch
'xtarterize': patch
---

Remove synonym expansion from task query scoring

The `query` command and `init --compose` no longer expand query terms through a
hardcoded synonym map. Scoring still tokenizes the query and matches tokens
against task metadata with stemming (0.95), fuzzy (0.85), prefix (0.75), and
substring (0.55) tiers, so the documented rankings for "strict typescript",
"ci pipeline", "linting and formatting tool", "react testing", and
"dependency updates" are unchanged.

Queries that matched through a synonym still match their tasks but score much
lower: "types" still ranks `ts/strict` first, "updates" still ranks
`deps/renovate` first, and "code" still ranks `editor/vscode` second. "typing"
now returns no results. Broaden the query or lower `--threshold` when that
happens. Recorded in ADR 038.

Patch rather than major: the CLI contract still works, and no dependency or
generated config format changed. A major bump for the fixed group is already
pending from the plugin-removal changeset, so this rides the same release.
