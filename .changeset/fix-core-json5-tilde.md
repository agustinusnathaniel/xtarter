---
"@xtarterize/core": patch
---

fix(core): parse .xtarterizerc with JSON5 and align plugin specifier regex

Support JSON5 superset (comments, trailing commas, single quotes) for .xtarterizerc files via JSON5.parse to match package.json handling, and allow tilde (~) in plugin specifier names to match npm naming and test expectations.
