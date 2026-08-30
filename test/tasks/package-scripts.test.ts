import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { packageScriptsTask } from '@xtarterize/tasks'
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

	it('returns patch when project has existing scripts', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await packageScriptsTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('patch')
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
				devDependencies: {
					vitest: '^3.0.0',
					'@biomejs/biome': '^1.0.0',
					typescript: '^5.3.0',
					knip: '^5.0.0',
					'commit-and-tag-version': '^12.0.0',
					plop: '^4.0.0',
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

	it('skips biome when existing lint uses biome', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-biome-equivalence-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'biome-equivalence',
				type: 'module',
				scripts: {
					lint: 'biome check .',
				},
				devDependencies: {
					'@biomejs/biome': '^1.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).not.toContain('"biome"')
		expect(pkgDiff?.after).toContain('"test"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips upgrade when existing up-latest uses same tool', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-upgrade-equivalence-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'upgrade-equivalence',
				type: 'module',
				scripts: {
					'up-latest': 'pnpm up -i -L',
				},
			}),
		)
		// Create lockfile so PM detection returns pnpm
		await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '')

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).not.toContain('"upgrade"')
		expect(pkgDiff?.after).toContain('"biome"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips when same script via different PM reference', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-pm-script-ref-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'pm-script-ref',
				type: 'module',
				scripts: {
					'npm:build': 'turbo run build',
					dev: 'next dev',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).not.toContain('"build"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('does not add lint scripts when ESLint is detected', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-eslint-nolint-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'eslint-only',
				type: 'module',
				scripts: {
					lint: 'eslint .',
				},
				devDependencies: {
					eslint: '^8.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).not.toContain('"biome"')
		expect(pkgDiff?.after).not.toContain('"biome:fix"')
		expect(pkgDiff?.after).not.toContain('"lint": "vp')
		expect(pkgDiff?.after).not.toContain('"check"')
		expect(pkgDiff?.after).not.toContain('"fix"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('does not skip same tool with different arguments', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-diff-args-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'diff-args',
				type: 'module',
				scripts: {
					'biome:check': 'biome check src/',
				},
				devDependencies: {
					'@biomejs/biome': '^1.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).toContain('"biome"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('keeps check:turbo when existing has same tasks but adds other scripts', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-turbo-same-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'turbo-same',
				type: 'module',
				scripts: {
					'check:turbo': 'turbo run biome typecheck test',
				},
				devDependencies: {
					turbo: '^2.0.0',
					typescript: '^5.3.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).toContain('"check:turbo"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('adds missing scripts when check:turbo exists with different tasks', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-turbo-diff-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'turbo-diff',
				type: 'module',
				scripts: {
					'check:turbo': 'turbo run lint build',
				},
				devDependencies: {
					turbo: '^2.0.0',
					typescript: '^5.3.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).toContain('"biome"')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('uses existing script keys in check:turbo when available', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-turbo-refs-existing-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'turbo-refs-existing',
				type: 'module',
				scripts: {
					lint: 'biome check .',
					typecheck: 'tsc --noEmit',
					test: 'vitest run',
				},
				devDependencies: {
					turbo: '^2.0.0',
					typescript: '^5.3.0',
					'@biomejs/biome': '^1.0.0',
					vitest: '^1.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(pkgDiff?.after).toContain('"check:turbo"')
		expect(pkgDiff?.after).toContain('turbo run lint typecheck test')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('only adds missing scripts and builds check:turbo from all refs', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-turbo-partial-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'turbo-partial',
				type: 'module',
				scripts: {
					lint: 'biome check .',
					test: 'vitest run',
				},
				devDependencies: {
					turbo: '^2.0.0',
					typescript: '^5.3.0',
					'@biomejs/biome': '^1.0.0',
					vitest: '^1.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(pkgDiff?.after).toContain('"typecheck"')
		expect(pkgDiff?.after).toContain('"check:turbo"')
		expect(pkgDiff?.after).toContain('turbo run lint typecheck test')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('does not duplicate existing biome when lint exists with biome', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-no-dup-biome-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'no-dup-biome',
				type: 'module',
				scripts: {
					lint: 'biome check .',
				},
				devDependencies: {
					turbo: '^2.0.0',
					typescript: '^5.3.0',
					'@biomejs/biome': '^1.0.0',
					vitest: '^1.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageScriptsTask.check(tmpDir, profile)
		const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
		const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

		expect(status).toBe('patch')
		expect(pkgDiff?.after).not.toContain('"biome"')
		expect(pkgDiff?.after).toContain('"typecheck"')
		expect(pkgDiff?.after).toContain('"test"')
		expect(pkgDiff?.after).toContain('"check:turbo"')
		expect(pkgDiff?.after).toContain('turbo run lint typecheck test')

		await fs.rm(tmpDir, { recursive: true })
	})
})
