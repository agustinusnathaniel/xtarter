---
'xtarterize': minor
---

feat: emit GitHub Actions workflow command annotations from check

- New `--annotations` flag on `check` emits `::error`/`::warning` workflow
  command annotations per non-conformant task and failing diagnostic, so
  conformance failures surface inline on files in GitHub Actions.
- Auto-enabled when running inside GitHub Actions (`GITHUB_ACTIONS=true`).
- Annotations are emitted on stderr so `--json` and `--badge -` output stays
  machine-readable.
