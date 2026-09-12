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

Queries that matched only through a synonym now score lower or return no
results: "types" and "typing" no longer reach the TypeScript task terms, and
"updates" no longer reaches the dependency task terms. Broaden the query or
lower `--threshold` when that happens. Recorded in ADR 038.

Patch rather than major: the CLI contract still works, and no dependency or
generated config format changed. A major bump for the fixed group is already
pending from the plugin-removal changeset, so this rides the same release.
