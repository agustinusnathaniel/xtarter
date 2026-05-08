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

	it('does not skip different tools even with similar patterns', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-different-tools-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'different-tools',
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
		expect(pkgDiff?.after).toContain('"biome"')
		expect(pkgDiff?.after).toContain('"biome:fix"')

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

	describe('edge cases', () => {
		it('handles empty scripts object', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-empty-scripts-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'empty-scripts',
					type: 'module',
					scripts: {},
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

			expect(status).toBe('new')
			expect(pkgDiff?.after).toContain('"biome"')
			expect(pkgDiff?.after).toContain('"typecheck"')
			expect(pkgDiff?.after).toContain('"test"')
			expect(pkgDiff?.after).toContain('"check:turbo"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('handles script with empty value', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-empty-value-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'empty-value',
					type: 'module',
					scripts: {
						lint: '',
						build: 'turbo run build',
					},
					devDependencies: {
						turbo: '^2.0.0',
						typescript: '^5.3.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"biome"')
			expect(pkgDiff?.after).toContain('"test"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('skips biome when existing eslint uses biome', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-eslint-biome-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'eslint-biome',
					type: 'module',
					scripts: {
						lint: 'eslint . --fix',
					},
					devDependencies: {
						eslint: '^8.0.0',
						turbo: '^2.0.0',
						typescript: '^5.3.0',
						vitest: '^1.0.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"biome"')
			expect(pkgDiff?.after).toContain('"check:turbo"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('does not skip biome when existing lint has different args', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-diff-args-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'diff-args',
					type: 'module',
					scripts: {
						lint: 'biome check src/',
					},
					devDependencies: {
						'@biomejs/biome': '^1.0.0',
						turbo: '^2.0.0',
						typescript: '^5.3.0',
						vitest: '^1.0.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"biome"')
			expect(pkgDiff?.after).toContain('"typecheck"')
			expect(pkgDiff?.after).toContain('"test"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('handles namespaced script references separately', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-pm-ref-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'pm-ref',
					type: 'module',
					scripts: {
						'npm:build': 'turbo run build',
						'pnpm:dev': 'turbo run dev',
						typecheck: 'tsc --noEmit',
					},
					devDependencies: {
						turbo: '^2.0.0',
						typescript: '^5.3.0',
						vitest: '^1.0.0',
						'@biomejs/biome': '^1.0.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"typecheck"')
			expect(pkgDiff?.after).toContain('"biome"')
			expect(pkgDiff?.after).toContain('"test"')
			expect(pkgDiff?.after).toContain('"check:turbo"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('non-TS project does not add typecheck or knip', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-non-ts-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'non-ts',
					type: 'module',
					scripts: {
						lint: 'biome check .',
					},
					devDependencies: {
						turbo: '^2.0.0',
						'@biomejs/biome': '^1.0.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).not.toContain('"typecheck"')
			expect(pkgDiff?.after).not.toContain('"knip"')
			expect(pkgDiff?.after).toContain('"test"')
			expect(pkgDiff?.after).toContain('"check:turbo"')
			expect(pkgDiff?.after).toContain('turbo run lint test')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('non-turbo monorepo does not add check:turbo', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-no-turbo-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'no-turbo',
					type: 'module',
					scripts: {},
					devDependencies: {
						typescript: '^5.3.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).not.toContain('check:turbo')
			expect(pkgDiff?.after).toContain('"biome"')
			expect(pkgDiff?.after).toContain('"typecheck"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('adds upgrade script even with npx npm-check-updates', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-upgrade-dup-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'upgrade-dup',
					type: 'module',
					scripts: {
						upgrade: 'npx npm-check-updates -i',
					},
					devDependencies: {},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"upgrade"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('adds upgrade when existing is different', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-upgrade-diff-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'upgrade-diff',
					type: 'module',
					scripts: {
						upgrade: 'npm outdated',
					},
					devDependencies: {},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"upgrade"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('check:turbo uses only existing keys when all exist', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-turbo-all-exist-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'turbo-all-exist',
					type: 'module',
					scripts: {
						lint: 'biome check .',
						check: 'biome check --write .',
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
			const status = await packageScriptsTask.check(tmpDir, profile)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(status).toBe('patch')
			expect(pkgDiff?.after).toContain('"check:turbo"')
			expect(pkgDiff?.after).toContain('turbo run lint typecheck test')
			expect(pkgDiff?.after).not.toContain('"biome"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('check:turbo mixes existing and new tasks correctly', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-turbo-mix-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'turbo-mix',
					type: 'module',
					scripts: {
						fmt: 'biome check --write .',
					},
					devDependencies: {
						turbo: '^2.0.0',
						typescript: '^5.3.0',
						'@biomejs/biome': '^1.0.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"typecheck"')
			expect(pkgDiff?.after).toContain('"test"')
			expect(pkgDiff?.after).toContain('"check:turbo"')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('handles script with trailing spaces', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-trailing-spaces-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'trailing-spaces',
					type: 'module',
					scripts: {
						biome: 'biome check .   ',
					},
					devDependencies: {
						'@biomejs/biome': '^1.0.0',
						turbo: '^2.0.0',
						typescript: '^5.3.0',
						vitest: '^1.0.0',
					},
				}),
			)

			const profile = await detectProject(tmpDir)
			const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

			expect(pkgDiff?.after).toContain('"biome":')

			await fs.rm(tmpDir, { recursive: true })
		})

		describe('all managed scripts use pragmatic approach', () => {
			it('skips biome:fix when existing has check with biome', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-biome-fix-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'biome-fix-skip',
						type: 'module',
						scripts: {
							biome: 'biome check .',
							check: 'biome check --write .',
						},
						devDependencies: {
							'@biomejs/biome': '^1.0.0',
							turbo: '^2.0.0',
							typescript: '^5.3.0',
							vitest: '^1.0.0',
						},
					}),
				)

				const profile = await detectProject(tmpDir)
				const status = await packageScriptsTask.check(tmpDir, profile)
				const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
				const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

				expect(status).toBe('patch')
				expect(pkgDiff?.after).not.toContain('"biome:fix"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"test"')
				expect(pkgDiff?.after).toContain('"check:turbo"')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('skips test when existing has vitest', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-test-skip-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'test-skip',
						type: 'module',
						scripts: {
							test: 'vitest run --coverage',
						},
						devDependencies: {
							vitest: '^1.0.0',
							turbo: '^2.0.0',
							typescript: '^5.3.0',
							'@biomejs/biome': '^1.0.0',
						},
					}),
				)

				const profile = await detectProject(tmpDir)
				const status = await packageScriptsTask.check(tmpDir, profile)
				const diffs = await packageScriptsTask.dryRun(tmpDir, profile)
				const pkgDiff = diffs.find((d) => d.filepath === 'package.json')

				expect(status).toBe('patch')
				expect(pkgDiff?.after).toContain('"test"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"check:turbo"')
				expect(pkgDiff?.after).toContain('turbo run biome typecheck test')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('skips release when existing has standard-version', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-release-skip-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'release-skip',
						type: 'module',
						scripts: {
							release: 'standard-version',
						},
						devDependencies: {
							'standard-version': '^9.0.0',
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
				expect(pkgDiff?.after).toContain('"release"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"test"')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('skips plop when existing has hygen', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-plop-skip-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'plop-skip',
						type: 'module',
						scripts: {
							generate: 'hygen',
						},
						devDependencies: {
							hygen: '^6.0.0',
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
				expect(pkgDiff?.after).not.toContain('"plop"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"test"')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('skips knip when existing has depcheck', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-knip-skip-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'knip-skip',
						type: 'module',
						scripts: {
							knip: 'depcheck',
						},
						devDependencies: {
							depcheck: '^1.0.0',
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
				expect(pkgDiff?.after).toContain('"knip"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"test"')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('skips upgrade when existing has npm-check-updates', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-upgrade-skip-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'upgrade-skip',
						type: 'module',
						scripts: {
							upgrade: 'npx npm-check-updates -u',
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
				expect(pkgDiff?.after).toContain('"upgrade"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"test"')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('skips typecheck when existing has tsc with different args', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-typecheck-skip-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'typecheck-skip',
						type: 'module',
						scripts: {
							typecheck: 'tsc --noEmit --build',
						},
						devDependencies: {
							typescript: '^5.3.0',
							turbo: '^2.0.0',
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
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"test"')
				expect(pkgDiff?.after).toContain('"check:turbo"')
				expect(pkgDiff?.after).toContain('turbo run biome typecheck test')

				await fs.rm(tmpDir, { recursive: true })
			})

			it('adds all missing scripts when none exist', async () => {
				const tmpDir = await fs.mkdtemp(
					path.join(os.tmpdir(), 'xtarterize-all-missing-'),
				)
				await fs.writeFile(
					path.join(tmpDir, 'package.json'),
					JSON.stringify({
						name: 'all-missing',
						type: 'module',
						scripts: {},
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

				expect(pkgDiff?.after).toContain('"biome"')
				expect(pkgDiff?.after).toContain('"biome:fix"')
				expect(pkgDiff?.after).toContain('"test"')
				expect(pkgDiff?.after).toContain('"typecheck"')
				expect(pkgDiff?.after).toContain('"knip"')
				expect(pkgDiff?.after).toContain('"upgrade"')
				expect(pkgDiff?.after).toContain('"release"')
				expect(pkgDiff?.after).toContain('"plop"')
				expect(pkgDiff?.after).toContain('"check:turbo"')

				await fs.rm(tmpDir, { recursive: true })
			})
		})

		it('respects existing check:turbo with same tasks', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-check-turbo-same-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'check-turbo-same',
					type: 'module',
					scripts: {
						biome: 'biome check .',
						typecheck: 'tsc --noEmit',
						test: 'vitest run',
						'check:turbo': 'turbo run biome typecheck test',
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
			expect(pkgDiff?.after).toContain('check:turbo')

			await fs.rm(tmpDir, { recursive: true })
		})

		it('overwrites existing check:turbo with different tasks', async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), 'xtarterize-check-turbo-diff-'),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'check-turbo-diff',
					type: 'module',
					scripts: {
						'check:turbo': 'turbo run lint build',
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
			expect(pkgDiff?.after).toContain('"check:turbo"')
			expect(pkgDiff?.after).toContain('"biome"')

			await fs.rm(tmpDir, { recursive: true })
		})
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
