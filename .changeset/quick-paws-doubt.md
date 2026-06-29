---
'@xtarterize/core': patch
'xtarterize': patch
---

fix: handle package install failures gracefully and fix CI test stability

- installDependency now catches nypm errors and logs a warning instead of
  throwing, preventing package install failures from blocking config
  modifications
- doctor --verbose now correctly overrides CI-forced quiet mode
- Explicit turbo dependencies ensure build outputs exist before tests run
- Increase test timeouts for slow pnpm installs in CI
