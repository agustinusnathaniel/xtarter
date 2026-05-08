---
"@xtarterize/core": patch
---

Refactor `detectExistingConfigs` to be data-driven with `ConfigDetector[]`

- Add `ConfigDetector` type mapping to keys in `ProjectProfile['existing']`
- Implement individual detector functions for biome, tsconfig, renovate, commitlint, knip, plop, turbo, vscode, agents, github workflows, vite, versionrc, gitignore
- Replace imperative detection logic with declarative detector array
