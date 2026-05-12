import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	editorconfigTask,
	lintStagedTask,
	npmrcTask,
	nvmrcTask,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('editorconfigTask', () => {
	it('applies to any project', () => {
		expect(editorconfigTask.applicable({} as never)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await editorconfigTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('returns expected content in dryRun', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await editorconfigTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs[0].filepath).toBe('.editorconfig')
		expect(diffs[0].after).toContain('indent_style = space')
	})
})

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
})

describe('nvmrcTask', () => {
	it('applies to any project', () => {
		expect(nvmrcTask.applicable({} as never)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await nvmrcTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('returns expected content in dryRun', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await nvmrcTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs[0].filepath).toBe('.nvmrc')
		expect(diffs[0].after).toContain('lts/*')
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
