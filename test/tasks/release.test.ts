import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { catVersionTask, commitlintTask, czgTask } from '@xtarterize/tasks'
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
