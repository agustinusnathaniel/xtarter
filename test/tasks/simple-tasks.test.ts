import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { lintStagedTask, npmrcTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('npmrcTask', () => {
	it('applies to any project', () => {
		expect(npmrcTask.applicable({} as never)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await npmrcTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('returns expected content in dryRun', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await npmrcTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs[0].filepath).toBe('.npmrc')
		expect(diffs[0].after).toContain('save-exact=true')
	})

	it('apply writes the expected file', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-npmrc-apply-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'apply-test' }),
		)
		const profile = await detectProject(tmpDir)
		await npmrcTask.apply(tmpDir, profile)
		const exists = await fs
			.access(path.join(tmpDir, '.npmrc'))
			.then(() => true)
			.catch(() => false)
		expect(exists).toBe(true)
		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})

describe('lintStagedTask', () => {
	it('applies to any project', () => {
		expect(lintStagedTask.applicable({} as never)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await lintStagedTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('patch')
	})

	it('uses biome check by default in dryRun', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await lintStagedTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const diff = diffs.find((d) => d.filepath === '.lintstagedrc.json')
		expect(diff?.after).toContain('biome check')
	})

	it('uses ultracite when present', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'ultracite-test',
					devDependencies: { ultracite: '^1.0.0' },
				}),
			)
			const profile = await detectProject(tmpDir)
			const diffs = await lintStagedTask.dryRun(tmpDir, profile)
			const diff = diffs.find((d) => d.filepath === '.lintstagedrc.json')
			expect(diff?.after).toContain('ultracite fix')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})
