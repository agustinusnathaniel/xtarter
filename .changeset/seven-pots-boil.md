---
'create-xtarter-app': minor
---

feat: add --quiet, --json, and --no-color flags

- `--quiet` suppresses banners, spinners, and decorative output
- `--json` outputs scaffold result as structured JSON
- `--no-color` disables colorized output

feat: improve --yes flag behavior

- `--yes` now defaults to next-chakra template when -t is omitted

feat: migrate to citty built-in help and version handling

- Removes hand-rolled HELP_TEXT constant in favor of citty auto-generation
