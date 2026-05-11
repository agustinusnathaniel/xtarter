import type { ProjectProfile } from '@xtarterize/core'
import { dlxCommand, installDependenciesCommand, runScriptCommand } from 'nypm'

function optionalScriptStep(
	label: string,
	command: string,
	script: string,
): string {
	return `      - name: ${label}
        run: |
          if node -e "process.exit(require('./package.json').scripts?.${script} ? 0 : 1)"; then
            ${command}
          fi`
}

export function renderAutoUpdateWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const dlx = dlxCommand(pm, 'npm-check-updates')
	const runLint = runScriptCommand(pm, 'lint')
	const runTypecheck = runScriptCommand(pm, 'typecheck')
	const runTest = runScriptCommand(pm, 'test')
	const setupCache = pm === 'bun' ? '' : `\n          cache: ${pm}`
	const qualitySteps = [`      - run: ${runLint}`]

	if (profile.typescript) {
		qualitySteps.push(`      - run: ${runTypecheck}`)
	}

	qualitySteps.push(optionalScriptStep('Test', runTest, 'test'))

	return `name: Auto Update Dependencies

on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
${pm === 'pnpm' ? '      - uses: pnpm/action-setup@v6\n' : ''}      - uses: actions/setup-node@v6
        with:
          node-version: 20${setupCache}
      - run: ${installCmd}
      - run: ${dlx} -u
      - run: ${installCmd}
${qualitySteps.join('\n')}
      - uses: peter-evans/create-pull-request@v8
        with:
          commit-message: 'chore(deps): update dependencies'
          title: 'chore(deps): update dependencies'
          body: 'Automated dependency updates'
          branch: chore/update-dependencies
          delete-branch: true
`
}
