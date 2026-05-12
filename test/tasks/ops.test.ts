import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	ensureTaskDependency,
	ensureTaskParentDir,
	writeTaskDiffs,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

describe('ensureTaskParentDir', () => {
	it('creates parent directory for nested path', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await ensureTaskParentDir(tmpDir, 'a/b/c.txt')
			const stat = await fs.stat(path.join(tmpDir, 'a', 'b'))
			expect(stat.isDirectory()).toBe(true)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('does not error when parent already exists', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.mkdir(path.join(tmpDir, 'existing'), { recursive: true })
			await expect(
				ensureTaskParentDir(tmpDir, 'existing/file.txt'),
			).resolves.toBeUndefined()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('writeTaskDiffs', () => {
	it('writes file diffs to disk', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await writeTaskDiffs(tmpDir, [
				{ filepath: 'test.txt', before: null, after: 'hello' },
			])
			const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8')
			expect(content).toBe('hello')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('creates intermediate directories', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await writeTaskDiffs(tmpDir, [
				{ filepath: 'nested/dir/file.txt', before: null, after: 'content' },
			])
			const stat = await fs.stat(path.join(tmpDir, 'nested', 'dir'))
			expect(stat.isDirectory()).toBe(true)
			const content = await fs.readFile(
				path.join(tmpDir, 'nested', 'dir', 'file.txt'),
				'utf-8',
			)
			expect(content).toBe('content')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('ensureTaskDependency', () => {
	it('returns early when depName is not set', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await expect(
				ensureTaskDependency({ cwd: tmpDir }),
			).resolves.toBeUndefined()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns early when dependency exists in package.json', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'test',
					devDependencies: { execa: '^9.0.0' },
				}),
			)
			await expect(
				ensureTaskDependency({ cwd: tmpDir, depName: 'execa' }),
			).resolves.toBeUndefined()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns early when dependency exists in dependencies', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'test',
					dependencies: { execa: '^9.0.0' },
				}),
			)
			await expect(
				ensureTaskDependency({ cwd: tmpDir, depName: 'execa' }),
			).resolves.toBeUndefined()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns early when no package.json exists', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await expect(
				ensureTaskDependency({ cwd: tmpDir, depName: 'execa' }),
			).resolves.toBeUndefined()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})
