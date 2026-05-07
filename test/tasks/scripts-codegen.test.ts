import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { packageScriptsTask, plopTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('packageScriptsTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(packageScriptsTask.applicable(profile)).toBe(true)
	})

	it('returns new when scripts are missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await packageScriptsTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun includes package.json diff', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await packageScriptsTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')
		expect(pkgDiff).toBeDefined()
		expect(pkgDiff?.after).toContain('biome')
		expect(pkgDiff?.after).toContain('biome:fix')
		expect(pkgDiff?.after).toContain('test')
		expect(pkgDiff?.after).toContain('typecheck')
		expect(pkgDiff?.after).toContain('upgrade')
		expect(pkgDiff?.after).toContain('release')
		expect(pkgDiff?.after).toContain('knip')
		expect(pkgDiff?.after).toContain('plop')
		expect(pkgDiff?.after).not.toContain('ultracite')
	})

	it('preserves existing scripts and only adds missing ones', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-script-conflict-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify(
				{
					name: 'script-conflict',
					type: 'module',
					scripts: {
						biome: 'eslint .',
					},
					dependencies: {
						next: '^14.1.0',
						react: '^18.2.0',
						'react-dom': '^18.2.0',
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
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).toContain('"biome": "eslint ."')
		expect(pkgDiff?.after).toContain('"biome:fix": "biome check --write ."')
	})

	it('skips scripts whose value already exists under a different key', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-script-dedup-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify(
				{
					name: 'script-dedup',
					type: 'module',
					scripts: {
						'type:check': 'tsc --noEmit',
						dev: 'next dev',
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
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).not.toContain('"typecheck"')
		expect(pkgDiff?.after).toContain('"test"')
	})

	it('does not add typecheck or knip for non-TS projects', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-no-ts-'))
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'no-ts-project',
				type: 'module',
			}),
		)

		const profile = await detectProject(tmpDir)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(pkgDiff?.after).not.toContain('"typecheck"')
		expect(pkgDiff?.after).not.toContain('"knip"')
		expect(pkgDiff?.after).toContain('"biome"')
		expect(pkgDiff?.after).toContain('"release"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('does not overwrite existing matching scripts', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-existing-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'existing-scripts',
				type: 'module',
				scripts: {
					biome: 'biome check .',
					'biome:fix': 'biome check --write .',
					test: 'vitest run',
					typecheck: 'tsc --noEmit',
					release: 'commit-and-tag-version',
					plop: 'plop',
					upgrade: 'pnpm up -i -L',
					knip: 'knip',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		expect(status).toBe('skip')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('uses ultracite scripts when Ultracite is installed', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-ultracite-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify(
				{
					name: 'ultracite-project',
					type: 'module',
					devDependencies: {
						ultracite: '^1.0.0',
						typescript: '^5.3.0',
					},
				},
				null,
				2,
			),
		)

		const profile = await detectProject(tmpDir)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(pkgDiff?.after).toContain('"ultracite:check": "ultracite check"')
		expect(pkgDiff?.after).toContain('"ultracite:fix": "ultracite fix"')
		expect(pkgDiff?.after).not.toContain('"lint"')
		expect(pkgDiff?.after).not.toContain('"format"')
		expect(pkgDiff?.after).not.toContain('biome')
		expect(pkgDiff?.after).toContain('"typecheck"')
		expect(pkgDiff?.after).toContain('"release"')
	})
})

describe('plopTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(plopTask.applicable(profile)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await plopTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('renders generators with prompts and actions', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await plopTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)

		expect(diffs[0].after).toContain("plop.setGenerator('component'")
		expect(diffs[0].after).toContain('prompts: [namePrompt]')
		expect(diffs[0].after).toContain('actions: [')
		expect(diffs[0].after).not.toContain('prompts: []')
		expect(diffs[0].after).not.toContain('actions: []')
	})
})
