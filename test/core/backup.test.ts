import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	BackupError,
	backupFile,
	listAllBackups,
	listBackups,
	readRunManifest,
	restoreBackup,
	writeRunManifest,
} from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('backup', () => {
	it('recovers when backup index is malformed', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-backup-'),
		)
		await fs.writeFile(path.join(tmpDir, 'foo.txt'), 'before', 'utf-8')

		const backupDir = path.join(tmpDir, '.xtarterize', 'backups')
		await fs.mkdir(backupDir, { recursive: true })
		await fs.writeFile(path.join(backupDir, '.index.json'), '{broken', 'utf-8')

		await backupFile(tmpDir, 'foo.txt')
		const backups = await listBackups(tmpDir, 'foo.txt')

		expect(backups.length).toBe(1)
		expect(backups[0]?.filepath).toBe('foo.txt')
		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	it('backup → modify → restore round-trip preserves original content', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-roundtrip-'),
		)
		const filePath = 'test.txt'
		const originalContent = 'original content'
		const fullPath = path.join(tmpDir, filePath)
		await fs.writeFile(fullPath, originalContent, 'utf-8')

		await backupFile(tmpDir, filePath)

		await fs.writeFile(fullPath, 'modified content', 'utf-8')

		const backups = await listBackups(tmpDir, filePath)
		expect(backups.length).toBe(1)

		await restoreBackup(tmpDir, backups[0]!)

		const restoredContent = await fs.readFile(fullPath, 'utf-8')
		expect(restoredContent).toBe(originalContent)

		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	it('backupFile handles non-existent source file gracefully', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-nonexistent-'),
		)

		await expect(backupFile(tmpDir, 'nonexistent.txt')).resolves.toBeUndefined()

		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	it('restoreBackup with missing backup file reports error', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-badrestore-'),
		)

		const invalidBackup = {
			filepath: 'some-file.txt',
			backupPath: path.join(tmpDir, '.xtarterize', 'backups', 'no-such-backup'),
			timestamp: new Date().toISOString(),
		}

		await expect(restoreBackup(tmpDir, invalidBackup)).rejects.toThrow()

		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})

describe('run manifest', () => {
	it('writes and reads a run manifest', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-manifest-'),
		)

		await writeRunManifest(tmpDir, ['tsconfig.json', 'biome.json'])
		const manifest = await readRunManifest(tmpDir)

		expect(manifest).not.toBeNull()
		expect(manifest?.files).toEqual(['tsconfig.json', 'biome.json'])
		expect(manifest?.timestamp).toBeTruthy()

		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	it('returns null when no manifest exists', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-manifest-'),
		)

		const manifest = await readRunManifest(tmpDir)
		expect(manifest).toBeNull()

		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})

describe('listAllBackups', () => {
	it('returns all backups grouped by filepath', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-backup-'),
		)
		await fs.writeFile(path.join(tmpDir, 'a.txt'), 'a', 'utf-8')
		await fs.writeFile(path.join(tmpDir, 'b.txt'), 'b', 'utf-8')

		await backupFile(tmpDir, 'a.txt')
		await backupFile(tmpDir, 'b.txt')

		const all = await listAllBackups(tmpDir)
		expect(Object.keys(all).sort()).toEqual(['a.txt', 'b.txt'])
		expect(all['a.txt']?.length).toBe(1)
		expect(all['b.txt']?.length).toBe(1)

		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	it('returns empty object when no index exists', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-backup-'),
		)

		const all = await listAllBackups(tmpDir)
		expect(all).toEqual({})

		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})

describe('restoreBackup security', () => {
	it('restoreBackup with traversal path throws BackupError', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-traversal-'),
		)

		const traversalBackup = {
			filepath: '../../../etc/passwd',
			backupPath: path.join(tmpDir, '.xtarterize', 'backups', 'some-backup'),
			timestamp: new Date().toISOString(),
		}

		await expect(restoreBackup(tmpDir, traversalBackup)).rejects.toThrow(
			BackupError,
		)

		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})
