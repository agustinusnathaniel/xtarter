import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	gitignoreTsbuildinfoTask,
	incrementalTask,
	pathsTask,
	strictTask,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('gitignoreTsbuildinfoTask', () => {
	it('is applicable to TS projects only', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(gitignoreTsbuildinfoTask.applicable(tsProfile)).toBe(true)

		const nonTsProfile = await detectProject(
			path.join(fixtures, 'monorepo-turbo'),
		)
		expect(gitignoreTsbuildinfoTask.applicable(nonTsProfile)).toBe(false)
	})

	it('returns new when .gitignore is missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await gitignoreTsbuildinfoTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun returns correct content', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await gitignoreTsbuildinfoTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBe(1)
		expect(diffs[0].filepath).toBe('.gitignore')
		expect(diffs[0].before).toBeNull()
		expect(diffs[0].after).toContain('.tsbuildinfo')
	})
})

describe('incrementalTask', () => {
	it('is applicable to TS projects only', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(incrementalTask.applicable(tsProfile)).toBe(true)
	})

	it('returns patch when incremental is missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await incrementalTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('patch')
	})

	it('dryRun returns correct diff', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await incrementalTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBe(1)
		expect(diffs[0].after).toContain('incremental')
	})
})

describe('strictTask', () => {
	it('is applicable to TS projects only', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(strictTask.applicable(tsProfile)).toBe(true)

		const nonTsProfile = await detectProject(
			path.join(fixtures, 'monorepo-turbo'),
		)
		expect(strictTask.applicable(nonTsProfile)).toBe(false)
	})

	it('skips when strict is already enabled', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await strictTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('skip')
	})

	it('returns conflict when strict is explicitly false', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-strict-false-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: { strict: false, target: 'ES2020' },
			}),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'strict-false',
				devDependencies: { typescript: '^5.3.0' },
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await strictTask.check(tmpDir, profile)
		expect(status).toBe('conflict')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('returns patch when strict key is missing', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-strict-missing-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: { target: 'ES2020' },
			}),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'strict-missing',
				devDependencies: { typescript: '^5.3.0' },
			}),
		)

		const profile = await detectProject(tmpDir)
		const status = await strictTask.check(tmpDir, profile)
		expect(status).toBe('patch')

		await fs.rm(tmpDir, { recursive: true })
	})
})

describe('pathsTask', () => {
	it('is applicable to TS projects only', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(pathsTask.applicable(tsProfile)).toBe(true)

		const nonTsProfile = await detectProject(
			path.join(fixtures, 'monorepo-turbo'),
		)
		expect(pathsTask.applicable(nonTsProfile)).toBe(false)
	})

	it('skips when Vite path aliases already exist', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await pathsTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('skip')
	})

	it('skips Next path aliases when already configured', async () => {
		const profile = await detectProject(path.join(fixtures, 'nextjs'))
		const status = await pathsTask.check(path.join(fixtures, 'nextjs'), profile)
		const diffs = await pathsTask.dryRun(path.join(fixtures, 'nextjs'), profile)

		expect(status).toBe('skip')
		expect(diffs).toHaveLength(0)
	})

	it('adds src path aliases for non-Next TypeScript projects', async () => {
		const profile = await detectProject(path.join(fixtures, 'node-only'))
		const status = await pathsTask.check(
			path.join(fixtures, 'node-only'),
			profile,
		)
		const diffs = await pathsTask.dryRun(
			path.join(fixtures, 'node-only'),
			profile,
		)

		expect(status).toBe('patch')
		expect(diffs[0].after).toContain('"baseUrl": "."')
		expect(diffs[0].after).toContain('"@/*"')
		expect(diffs[0].after).toContain('"./src/*"')
	})
})
