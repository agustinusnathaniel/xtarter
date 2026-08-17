---
"@xtarterize/core": patch
"xtarterize": patch
---

fix: use atomic writes for run manifest to prevent corruption on crash, tighten plugin specifier regex to reject `~` in package names, and batch `add --all` task application for faster execution
