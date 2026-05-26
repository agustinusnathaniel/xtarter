import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyTasks, detectProject } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('applyTasks', () => {
	it('applies a single task successfully', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-apply-'))
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test', version: '1.0.0' }),
		)

		const profile = await detectProject(tmpDir)
		const mockTask = {
			id: 'mock/task',
			label: 'Mock Task',
			group: 'Test',
			applicable: () => true,
			check: async () => 'new' as const,
			dryRun: async () => [
				{ filepath: 'test.txt', before: null, after: 'hello' },
			],
			apply: async () => {
				await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello')
			},
		}

		const result = await applyTasks({ tasks: [mockTask], cwd: tmpDir, profile })
		expect(result.errors).toHaveLength(0)
		expect(result.applied).toBe(1)

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips tasks that are already applied', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-skip-'))
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test', version: '1.0.0' }),
		)
		await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello')

		const profile = await detectProject(tmpDir)
		const mockTask = {
			id: 'mock/task',
			label: 'Mock Task',
			group: 'Test',
			applicable: () => true,
			check: async () => 'skip' as const,
			dryRun: async () => [
				{ filepath: 'test.txt', before: 'hello', after: 'hello' },
			],
			apply: async () => {},
		}

		const result = await applyTasks({ tasks: [mockTask], cwd: tmpDir, profile })
		expect(result.skipped).toBe(1)
		expect(result.applied).toBe(0)

		await fs.rm(tmpDir, { recursive: true })
	})

	it('backs up existing files before applying selected tasks', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-backup-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test', version: '1.0.0' }),
		)
		await fs.writeFile(path.join(tmpDir, 'test.txt'), 'before')

		const profile = await detectProject(tmpDir)
		const mockTask = {
			id: 'mock/task',
			label: 'Mock Task',
			group: 'Test',
			applicable: () => true,
			check: async () => 'patch' as const,
			dryRun: async () => [
				{ filepath: 'test.txt', before: 'before', after: 'after' },
			],
			apply: async () => {
				await fs.writeFile(path.join(tmpDir, 'test.txt'), 'after')
			},
		}

		const result = await applyTasks({
			tasks: [mockTask],
			cwd: tmpDir,
			profile,
			selectedIds: [mockTask.id],
		})
		expect(result.errors).toHaveLength(0)
		expect(result.applied).toBe(1)

		const backupIndex = JSON.parse(
			await fs.readFile(
				path.join(tmpDir, '.xtarterize/backups/.index.json'),
				'utf-8',
			),
		)
		expect(backupIndex['test.txt']).toHaveLength(1)
		const backupPath = backupIndex['test.txt'][0].backupPath
		await expect(fs.readFile(backupPath, 'utf-8')).resolves.toBe('before')
		await expect(
			fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8'),
		).resolves.toBe('after')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips conflict tasks unless includeConflicts is set', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-conflict-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test', version: '1.0.0' }),
		)

		const profile = await detectProject(tmpDir)
		let applied = false
		const mockTask = {
			id: 'mock/conflict',
			label: 'Mock Conflict',
			group: 'Test',
			applicable: () => true,
			check: async () => 'conflict' as const,
			dryRun: async () => [
				{ filepath: 'test.txt', before: 'before', after: 'after' },
			],
			apply: async () => {
				applied = true
			},
		}

		const skipped = await applyTasks({
			tasks: [mockTask],
			cwd: tmpDir,
			profile,
		})
		expect(skipped.skipped).toBe(1)
		expect(skipped.applied).toBe(0)
		expect(applied).toBe(false)

		const withSelectedIds = await applyTasks({
			tasks: [mockTask],
			cwd: tmpDir,
			profile,
			selectedIds: [mockTask.id],
		})
		expect(withSelectedIds.skipped).toBe(1)
		expect(withSelectedIds.applied).toBe(0)
		expect(applied).toBe(false)

		const withIncludeConflicts = await applyTasks({
			tasks: [mockTask],
			cwd: tmpDir,
			profile,
			selectedIds: [mockTask.id],
			includeConflicts: true,
		})
		expect(withIncludeConflicts.skipped).toBe(0)
		expect(withIncludeConflicts.applied).toBe(1)
		expect(applied).toBe(true)

		await fs.rm(tmpDir, { recursive: true })
	})

	it('applies conflict tasks when includeConflicts option is true', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-include-conflicts-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test', version: '1.0.0' }),
		)

		const profile = await detectProject(tmpDir)
		let applied = false
		const mockTask = {
			id: 'mock/conflict',
			label: 'Mock Conflict',
			group: 'Test',
			applicable: () => true,
			check: async () => 'conflict' as const,
			dryRun: async () => [
				{ filepath: 'test.txt', before: 'before', after: 'after' },
			],
			apply: async () => {
				applied = true
			},
		}

		const result = await applyTasks({
			tasks: [mockTask],
			cwd: tmpDir,
			profile,
			includeConflicts: true,
		})
		expect(result.applied).toBe(1)
		expect(result.skipped).toBe(0)
		expect(applied).toBe(true)

		await fs.rm(tmpDir, { recursive: true })
	})

	it('continues applying remaining tasks after one fails', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-partial-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test', version: '1.0.0' }),
		)

		const profile = await detectProject(tmpDir)
		const failingTask = {
			id: 'mock/fail',
			label: 'Failing Task',
			group: 'Test',
			applicable: () => true,
			check: async () => 'new' as const,
			dryRun: async () => [],
			apply: async () => {
				throw new Error('intentional failure')
			},
		}
		let goodApplied = false
		const goodTask = {
			id: 'mock/good',
			label: 'Good Task',
			group: 'Test',
			applicable: () => true,
			check: async () => 'new' as const,
			dryRun: async () => [],
			apply: async () => {
				goodApplied = true
			},
		}

		const result = await applyTasks({
			tasks: [failingTask, goodTask],
			cwd: tmpDir,
			profile,
		})
		expect(result.applied).toBe(1)
		expect(result.errors).toHaveLength(1)
		expect(result.errors[0]).toContain('intentional failure')
		expect(goodApplied).toBe(true)

		await fs.rm(tmpDir, { recursive: true })
	})
})
