---
'xtarterize': patch
---

`init`, `add`, and `sync` no longer fail with "No package manager auto-detected" when installing dependencies on fresh projects that have `package.json` but no lockfile: the detected package manager (npm fallback) is now passed to dependency installs instead of letting nypm re-run its own detection, which found nothing and threw.
