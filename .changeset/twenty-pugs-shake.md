---
"@xtarterize/tasks": patch
---

fix: move npx `--yes` flag before package name and add 60s timeout to agent/skills-install

The `-y` flag was passed after `skills@latest` arguments, so npx still prompted
"Ok to proceed?" and hung on user input. Moved `--yes` to a npx flag position
before the package name, and added a 60-second timeout to prevent indefinite
hanging on slow networks.
