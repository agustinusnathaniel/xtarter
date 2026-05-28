---
"@xtarterize/tasks": patch
---

Remove editorconfig, nvmrc, and agent/skills tasks; simplify AGENTS.md to minimal root; make plop framework-aware

- Drop `editor/editorconfig` — redundant with linters + VSCode settings
- Drop `scripts/nvmrc` — `lts/*` too vague to be meaningful
- Drop `agent/skills` — not a real skill structure, duplicated AGENTS.md content
- Simplify `agent/agents-md` template to minimal root (description + commands only)
- Change `codegen/plop` applicable condition to require a detected framework
