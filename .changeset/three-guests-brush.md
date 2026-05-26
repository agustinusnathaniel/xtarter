---
"create-xtarter-app": minor
---

feat: add --force, --ref flags, cwd scaffold, better --yes behavior, and error recovery

- New `--force` / `-f` flag overwrites existing directories
- New `--ref` flag pins template version to a git ref
- `create-xtarter-app .` scaffolds into current directory
- `--yes` no longer overrides explicit flags like `--pm bun`
- Partial scaffold failures clean up created directories
- Banner alignment fixed (was off by 2-4 chars per line)
