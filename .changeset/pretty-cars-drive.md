---
'@xtarterize/tasks': minor
'xtarterize': minor
---

feat: enhance TypeScript strict config, add new tasks, extend git hooks, improve VSCode settings

- ts/strict: now manages noUnusedLocals, noUnusedParameters, verbatimModuleSyntax alongside strict
- quality/package-engines: add devEngines field to package.json
- workspace/pnpm-workspace: generate pnpm-workspace.yaml for pnpm projects
- release/versionrc: generate .versionrc.json for changelog section customization
- release/git-hooks: add prepare-commit-msg hook for commitizen/czg integration
- editor/vscode: enhance settings.json with TanStack Router and TypeScript configs
