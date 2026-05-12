import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	catVersionTask,
	commitlintTask,
	czgTask,
	releaseWorkflowTask,
	renderReleaseWorkflow,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('commitlintTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(commitlintTask.applicable(profile)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await commitlintTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun returns diffs', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await commitlintTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBeGreaterThan(0)
		expect(diffs[0].before).toBeNull()
	})
})

describe('czgTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(czgTask.applicable(profile)).toBe(true)
	})

	it('returns new when script is missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await czgTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun includes package.json diff', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await czgTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')
		expect(pkgDiff).toBeDefined()
		expect(pkgDiff?.after).toContain('czg')
	})
})

describe('catVersionTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(catVersionTask.applicable(profile)).toBe(true)
	})

	it('returns new when dep and scripts are missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await catVersionTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun includes .versionrc diff', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await catVersionTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const versionrcDiff = diffs.find((d) => d.filepath === '.versionrc')
		expect(versionrcDiff).toBeDefined()
	})

	it('skips release script when it already exists with a different value', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-release-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify(
				{
					name: 'release-conflict',
					type: 'module',
					scripts: {
						release: 'custom-release',
					},
					devDependencies: {
						typescript: '^5.3.0',
					},
				},
				null,
				2,
			),
		)

		const profile = await detectProject(tmpDir)
		const status = await catVersionTask.check(tmpDir, profile)
		const diffs = await catVersionTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff).toBeUndefined()
	})
})

describe('releaseWorkflowTask', () => {
	it('renders tag-push workflow for non-changeset projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const result = renderReleaseWorkflow(profile, null)
		expect(result).toContain('tags:')
		expect(result).toContain("- 'v*'")
		expect(result).not.toContain('changesets/action')
	})

	it('renders changeset workflow for projects with .changeset config', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-changeset-'),
		)
		await fs.mkdir(path.join(tmpDir, '.changeset'))
		await fs.writeFile(
			path.join(tmpDir, '.changeset', 'config.json'),
			JSON.stringify({ baseBranch: 'main' }),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg', private: true }),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.existing.changeset).toBe(true)

		const result = renderReleaseWorkflow(profile, null)
		expect(result).toContain('changesets/action@v1')
		expect(result).toContain('id-token: write')
		expect(result).toContain('workflow_dispatch')
	})

	it('detects changeset via @changesets/cli dependency', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-changeset-dep-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'test-pkg',
				devDependencies: {
					'@changesets/cli': '^2.31.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.existing.changeset).toBe(true)
	})

	it('returns new when no release workflow exists (non-changeset)', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await releaseWorkflowTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('returns skip when existing workflow matches rendered template', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-release-skip-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg', private: true }),
		)

		const profile = await detectProject(tmpDir)
		const rendered = renderReleaseWorkflow(profile, null)

		await fs.mkdir(path.join(tmpDir, '.github', 'workflows'), {
			recursive: true,
		})
		await fs.writeFile(
			path.join(tmpDir, '.github', 'workflows', 'release.yml'),
			rendered,
		)

		const status = await releaseWorkflowTask.check(tmpDir, profile)
		expect(status).toBe('skip')
	})

	it('returns patch when changeset workflow exists with changesets/action but differs', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-changeset-patch-'),
		)
		await fs.mkdir(path.join(tmpDir, '.changeset'))
		await fs.writeFile(
			path.join(tmpDir, '.changeset', 'config.json'),
			JSON.stringify({ baseBranch: 'main' }),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg', private: true }),
		)

		const existing = `name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: changesets/action@v1
        with:
          publish: pnpm release
`

		await fs.mkdir(path.join(tmpDir, '.github', 'workflows'), {
			recursive: true,
		})
		await fs.writeFile(
			path.join(tmpDir, '.github', 'workflows', 'release.yml'),
			existing,
		)

		const profile = await detectProject(tmpDir)
		const status = await releaseWorkflowTask.check(tmpDir, profile)
		expect(status).toBe('patch')
	})

	it('returns conflict when changeset project has non-changeset release job', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-changeset-conflict-'),
		)
		await fs.mkdir(path.join(tmpDir, '.changeset'))
		await fs.writeFile(
			path.join(tmpDir, '.changeset', 'config.json'),
			JSON.stringify({ baseBranch: 'main' }),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg', private: true }),
		)

		const existing = `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - run: echo "custom release"
`

		await fs.mkdir(path.join(tmpDir, '.github', 'workflows'), {
			recursive: true,
		})
		await fs.writeFile(
			path.join(tmpDir, '.github', 'workflows', 'release.yml'),
			existing,
		)

		const profile = await detectProject(tmpDir)
		const status = await releaseWorkflowTask.check(tmpDir, profile)
		expect(status).toBe('conflict')
	})
})
