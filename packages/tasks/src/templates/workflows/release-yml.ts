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

export function renderReleaseWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const runLint = runScriptCommand(pm, 'lint')
	const runTypecheck = runScriptCommand(pm, 'typecheck')
	const runTest = runScriptCommand(pm, 'test')
	const runRelease = runScriptCommand(pm, 'release')
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
	]

	if (profile.typescript) {
		steps.push(`      - run: ${runTypecheck}`)
	}

	steps.push(optionalScriptStep('Test', runTest, 'test'))
	steps.push(`      - run: ${runRelease}`)

	return `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
${steps.join('\n')}
`
}
