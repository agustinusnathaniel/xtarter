---
'@xtarterize/core': minor
xtarterize: minor
---

CLIs now fail fast on invalid invocations instead of silently ignoring mistakes. Unknown commands and unknown options exit `1` before anything runs, with a suggested correction when one is close (`Unknown option --jsn for "xtarterize check". Did you mean --json?`). Typos in flags were previously dropped silently by the parser, so commands could run with defaults instead of what was requested.

Also ships the flags the agent-facing docs already promised but the parser never declared: `-y` aliases for `init`/`sync`/`restore` (`--yes`), and `--json` on `add`.

`@xtarterize/core` exports the reusable validation helpers (`validateInvocation`, `findUnknownFlags`, `findFirstPositionalIndex`, `suggestSimilar`) so downstream CLIs can share the same contract.
