import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { packageEnginesTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

const EXPECTED_DEV_ENGINES = {
	runtime: { name: 'node', version: '>=18' },
	packageManager: { name: 'pnpm', version: '>=9' },
}

describe('packageEnginesTask', () => {
	it('is applicable to all projects', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(packageEnginesTask.applicable(tsProfile)).toBe(true)

		const nonTsProfile = await detectProject(
			path.join(fixtures, 'monorepo-turbo'),
		)
		expect(packageEnginesTask.applicable(nonTsProfile)).toBe(true)
	})

	it('returns patch when devEngines is missing from package.json', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await packageEnginesTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('patch')
	})

	it('dryRun shows devEngines diff', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await packageEnginesTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBe(1)
		expect(diffs[0].filepath).toBe('package.json')
		expect(JSON.parse(diffs[0].after).devEngines).toEqual(EXPECTED_DEV_ENGINES)
	})

	it('skips when devEngines already matches', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-engines-skip-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'engines-test',
				devEngines: EXPECTED_DEV_ENGINES,
			}),
		)
		await fs.writeFile(path.join(tmpDir, '.nvmrc'), '18\n')

		const profile = await detectProject(tmpDir)
		const status = await packageEnginesTask.check(tmpDir, profile)
		expect(status).toBe('skip')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips when devEngines already exists (merge keeps existing values)', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-engines-diff-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'engines-test',
				devEngines: {
					runtime: { name: 'node', version: '>=18' },
					packageManager: { name: 'pnpm', version: '>=8' },
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await packageEnginesTask.check(tmpDir, profile)
		expect(status).toBe('skip')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('derives runtime floor from .nvmrc', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-engines-nvmrc-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'engines-test' }),
		)
		await fs.writeFile(path.join(tmpDir, '.nvmrc'), '20.11.1\n')

		const profile = await detectProject(tmpDir)
		const diffs = await packageEnginesTask.dryRun(tmpDir, profile)
		expect(diffs.length).toBe(1)
		expect(JSON.parse(diffs[0].after).devEngines).toEqual({
			runtime: { name: 'node', version: '>=20' },
			packageManager: { name: 'pnpm', version: '>=9' },
		})

		await fs.rm(tmpDir, { recursive: true })
	})

	it('derives runtime floor from engines.node', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-engines-node-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'engines-test',
				engines: { node: '^22.14.0' },
			}),
		)

		const profile = await detectProject(tmpDir)
		const diffs = await packageEnginesTask.dryRun(tmpDir, profile)
		expect(diffs.length).toBe(1)
		expect(JSON.parse(diffs[0].after).devEngines).toEqual({
			runtime: { name: 'node', version: '>=22' },
			packageManager: { name: 'pnpm', version: '>=9' },
		})

		await fs.rm(tmpDir, { recursive: true })
	})

	it('apply writes devEngines to package.json', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-engines-apply-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'engines-test',
				devDependencies: {},
			}),
		)
		await fs.writeFile(path.join(tmpDir, '.nvmrc'), '18\n')

		const profile = await detectProject(tmpDir)
		await packageEnginesTask.apply(tmpDir, profile)
		const content = JSON.parse(
			await fs.readFile(path.join(tmpDir, 'package.json'), 'utf-8'),
		)
		expect(content.devEngines).toEqual(EXPECTED_DEV_ENGINES)

		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})
