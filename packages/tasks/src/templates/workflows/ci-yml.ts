import type { ProjectProfile } from '@xtarterize/core'
import { installDependenciesCommand, runScriptCommand } from 'nypm'
import { ACTION_VERSIONS, NODE_VERSION } from './shared/versions.js'
import type { YamlStep } from './shared/workflow.js'
import { conditionalScriptStep, renderSteps } from './shared/workflow.js'

export function renderCiWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const runLint = runScriptCommand(pm, 'lint')
	const runTypecheck = runScriptCommand(pm, 'typecheck')
	const runCheck = runScriptCommand(pm, 'check')
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
		{ run: installCmd },
		{ run: runLint },
		{ run: runCheck },
	)

	if (profile.typescript) {
		steps.push({ run: runTypecheck })
	}

	steps.push(conditionalScriptStep('Test', runTest, 'test'))

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
${renderSteps(steps, 6)}
`
}
