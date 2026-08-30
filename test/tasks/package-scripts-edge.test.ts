import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { packageScriptsTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const _fixtures = path.resolve(__dirname, '../fixtures')

describe('packageScriptsTask', () => {
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

		it('skips all lint scripts when existing eslint uses biome', async () => {
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

			expect(pkgDiff?.after).not.toContain('"biome"')
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
