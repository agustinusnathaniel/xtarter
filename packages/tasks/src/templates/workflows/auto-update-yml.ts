import type { ProjectProfile } from '@xtarterize/core'
import { installDependenciesCommand, runScriptCommand } from 'nypm'
import { ACTION_VERSIONS, NODE_VERSION } from './shared/versions.js'
import type { YamlStep } from './shared/workflow.js'
import { conditionalScriptStep, renderSteps } from './shared/workflow.js'

export function renderAutoUpdateWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const updateCmd = pm === 'npm' ? 'npx npm-check-updates -u' : `${pm} update`
	const dedupeCmd = `${pm} dedupe`
	const runLint = runScriptCommand(pm, 'lint')
	const runTypecheck = runScriptCommand(pm, 'typecheck')
	const runTest = runScriptCommand(pm, 'test')

	const steps: YamlStep[] = [{ uses: ACTION_VERSIONS.CHECKOUT }]

	if (pm === 'pnpm') {
		steps.push({ uses: ACTION_VERSIONS.PNPM_SETUP, with: { cache: 'true' } })
	}

	steps.push(
		{
			uses: ACTION_VERSIONS.SETUP_NODE,
			with: {
				'node-version': String(NODE_VERSION),
				...(pm !== 'bun' ? { cache: pm } : {}),
			},
		},
		{
			name: 'Update dependencies',
			run: `${installCmd}\n${updateCmd}\n${dedupeCmd}`,
		},
		{ run: runLint },
	)

	if (profile.typescript) {
		steps.push({ run: runTypecheck })
	}

	steps.push(conditionalScriptStep('Test', runTest, 'test'))

	steps.push({
		uses: ACTION_VERSIONS.CREATE_PR,
		with: {
			'commit-message': 'chore(deps): update dependencies',
			title: 'chore(deps): update dependencies',
			body: 'Automated dependency updates',
			branch: 'chore/update-dependencies',
			'delete-branch': 'true',
		},
	})

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
${renderSteps(steps, 6)}
`
}
