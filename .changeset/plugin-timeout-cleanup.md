---
"@xtarterize/core": patch
---

fix: clear plugin import timeout to prevent unhandled rejection

`importWithTimeout` now clears its timer in `finally` after `Promise.race` settles — the previous code left the 10s timer running after a fast successful import, producing an unhandled promise rejection when the timer fired. Also deduplicates pnpm workspace detection via a shared `isPnpmWorkspace` helper.
