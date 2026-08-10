---
'xtarterize': patch
---

fix: keep `check --badge` output from polluting stdout in JSON mode and when writing the badge to stdout

- `check --badge - --json` no longer interleaves the badge SVG with the JSON payload on stdout — the SVG goes to stderr so the JSON stays parseable.
- `check --badge <file> --json` no longer lets the "Badge written" success message break the JSON payload.
- `check --badge -` (human mode) no longer follows the SVG with the human-readable audit on the same stream; the audit routes to stderr so piping the SVG to a file yields clean markup.
