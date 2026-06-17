import type { ProjectProfile } from '@xtarterize/core'
import { installDependenciesCommand, runScriptCommand } from 'nypm'
import { ACTION_VERSIONS } from './shared/versions.js'
import type { YamlStep } from './shared/workflow.js'
import { conditionalScriptStep, renderSteps } from './shared/workflow.js'

function renderTagPushWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const runLint = runScriptCommand(pm, 'lint')
	const runTypecheck = runScriptCommand(pm, 'typecheck')
	const runTest = runScriptCommand(pm, 'test')
	const runRelease = runScriptCommand(pm, 'release')

	const steps: YamlStep[] = [{ uses: ACTION_VERSIONS.CHECKOUT }]

	if (pm === 'pnpm') {
		steps.push({
			uses: ACTION_VERSIONS.PNPM_SETUP,
			with: { cache: 'true' },
		})
	}

	if (pm !== 'pnpm') {
		steps.push({
			uses: ACTION_VERSIONS.SETUP_NODE,
			with: {
				'node-version': profile.nodeVersion,
				...(pm !== 'bun' ? { cache: pm } : {}),
			},
		})
	}

	steps.push({ run: installCmd }, { run: runLint })

	if (profile.typescript) {
		steps.push({ run: runTypecheck })
	}

	steps.push(conditionalScriptStep('Test', runTest, 'test'))
	steps.push({ run: runRelease })

	return `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
${renderSteps(steps, 6)}
`
}

function renderChangesetWorkflow(profile: ProjectProfile): string {
	const pm = profile.packageManager
	const installCmd = installDependenciesCommand(pm)
	const runBuild = runScriptCommand(pm, 'build')

	const checkoutStep: YamlStep = {
		uses: ACTION_VERSIONS.CHECKOUT,
		with: { 'fetch-depth': '0' },
	}

	const steps: YamlStep[] = [checkoutStep]

	if (pm === 'bun') {
		steps.push({ uses: 'oven-sh/setup-bun@v2' })
	} else if (pm !== 'pnpm') {
		steps.push({
			uses: ACTION_VERSIONS.SETUP_NODE,
			with: {
				'node-version': profile.nodeVersion,
				cache: pm,
			},
		})
	}

	if (pm === 'pnpm') {
		steps.push({
			uses: ACTION_VERSIONS.PNPM_SETUP,
			with: { cache: 'true' },
		})
	}

	steps.push(
		{ run: installCmd },
		conditionalScriptStep('Build', runBuild, 'build'),
	)

	const versionScript = runScriptCommand(pm, 'version-packages')
	const publishScript = runScriptCommand(pm, 'release')

	const changesetActionStep: YamlStep = {
		name: 'Create Release Pull Request or Publish',
		if: "github.ref == 'refs/heads/main'",
		uses: 'changesets/action@v1',
		with: {
			version: versionScript,
			publish: publishScript,
			title: '"chore: version packages"',
			commit: '"chore: version packages"',
		},
		env: {
			// biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression syntax
			GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
		},
	}

	steps.push(changesetActionStep)

	return `name: Release

on:
  push:
    branches:
      - main
    paths:
      - ".changeset/**"
      - "**/CHANGELOG.md"
      - "**/package.json"
      - ".github/workflows/release.yml"
  pull_request:
    types:
      - opened
      - synchronize
  workflow_dispatch:
    inputs:
      version:
        description: "Version bump type (major, minor, patch). Leave empty for changeset-defined."
        required: false
        type: choice
        options:
          - major
          - minor
          - patch

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: write
  packages: write
  id-token: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
${renderSteps(steps, 6)}
`
}

export function renderReleaseWorkflow(
	profile: ProjectProfile,
	_existing: string | null,
): string {
	if (profile.existing.changeset) {
		return renderChangesetWorkflow(profile)
	}
	return renderTagPushWorkflow(profile)
}
