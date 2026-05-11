import type { ProjectProfile } from '@xtarterize/core'
import { installDependenciesCommand, runScriptCommand } from 'nypm'

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

export function renderCiWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const runLint = runScriptCommand(pm, 'lint')
	const runTypecheck = runScriptCommand(pm, 'typecheck')
	const runCheck = runScriptCommand(pm, 'check')
	const runTest = runScriptCommand(pm, 'test')
	const setupCache = pm === 'bun' ? '' : `\n          cache: ${pm}`

	const pnpmSetup = pm === 'pnpm' ? ['      - uses: pnpm/action-setup@v6'] : []

	const steps = [
		'      - uses: actions/checkout@v6',
		...pnpmSetup,
		'      - uses: actions/setup-node@v6',
		'        with:',
		`          node-version: 20${setupCache}`,
		`      - run: ${installCmd}`,
		`      - run: ${runLint}`,
		`      - run: ${runCheck}`,
	]

	if (profile.typescript) {
		steps.push(`      - run: ${runTypecheck}`)
	}

	steps.push(optionalScriptStep('Test', runTest, 'test'))

	return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
${steps.join('\n')}
`
}
