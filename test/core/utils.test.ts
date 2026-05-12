import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	backupFile,
	deepEqual,
	findConfigFile,
	getDependencyVersion,
	getNodeVersion,
	hasDependency,
	listBackups,
	readPackageJson,
	restoreBackup,
} from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('deepEqual', () => {
	it('returns true for identical primitives', () => {
		expect(deepEqual(1, 1)).toBe(true)
		expect(deepEqual('a', 'a')).toBe(true)
		expect(deepEqual(true, true)).toBe(true)
		expect(deepEqual(null, null)).toBe(true)
		expect(deepEqual(undefined, undefined)).toBe(true)
	})

	it('returns false for different primitives', () => {
		expect(deepEqual(1, 2)).toBe(false)
		expect(deepEqual('a', 'b')).toBe(false)
		expect(deepEqual(true, false)).toBe(false)
	})

	it('returns false for different types', () => {
		expect(deepEqual(1, '1')).toBe(false)
		expect(deepEqual({}, [])).toBe(false)
	})

	it('compares flat objects', () => {
		expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
		expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
		expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
	})

	it('compares nested objects', () => {
		expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
		expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
	})

	it('compares arrays', () => {
		expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
		expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
	})
})

describe('findConfigFile', () => {
	it('finds existing file by extension', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(path.join(tmpDir, 'vite.config.ts'), '')
			const result = await findConfigFile(tmpDir, 'vite.config', ['.ts', '.js'])
			expect(result).toBe(path.join(tmpDir, 'vite.config.ts'))
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('returns null when no file matches', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			const result = await findConfigFile(tmpDir, 'missing', ['.ts', '.js'])
			expect(result).toBeNull()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('tries extensions in order', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(path.join(tmpDir, 'config.js'), '')
			const result = await findConfigFile(tmpDir, 'config', [
				'.ts',
				'.js',
				'.mjs',
			])
			expect(result).toBe(path.join(tmpDir, 'config.js'))
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('readPackageJson', () => {
	it('returns null when no package.json', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			const result = await readPackageJson(tmpDir)
			expect(result).toBeNull()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('reads existing package.json', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
			)
			const result = await readPackageJson(tmpDir)
			expect(result?.name).toBe('test-pkg')
			expect(result?.version).toBe('1.0.0')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('hasDependency', () => {
	it('checks dependencies', () => {
		const pkg = {
			dependencies: { react: '^18.0.0' },
			devDependencies: { vite: '^5.0.0' },
		}
		expect(hasDependency(pkg, 'react')).toBe(true)
		expect(hasDependency(pkg, 'vite')).toBe(true)
		expect(hasDependency(pkg, 'typescript')).toBe(false)
	})

	it('handles empty deps', () => {
		expect(hasDependency({}, 'anything')).toBe(false)
	})
})

describe('getDependencyVersion', () => {
	it('returns version from dependencies', () => {
		const pkg = {
			dependencies: { react: '^18.0.0' },
		}
		expect(getDependencyVersion(pkg, 'react')).toBe('^18.0.0')
	})

	it('returns version from devDependencies', () => {
		const pkg = {
			devDependencies: { vite: '^5.0.0' },
		}
		expect(getDependencyVersion(pkg, 'vite')).toBe('^5.0.0')
	})

	it('prefers dependencies over devDependencies', () => {
		const pkg = {
			dependencies: { react: '^18.0.0' },
			devDependencies: { react: '^19.0.0' },
		}
		expect(getDependencyVersion(pkg, 'react')).toBe('^18.0.0')
	})

	it('returns undefined for missing dep', () => {
		expect(getDependencyVersion({}, 'missing')).toBeUndefined()
	})
})

describe('getNodeVersion', () => {
	it('returns version from engines', () => {
		const pkg = { engines: { node: '>=18' } }
		expect(getNodeVersion(pkg)).toBe('>=18')
	})

	it('defaults to 20 when no engines', () => {
		expect(getNodeVersion({})).toBe('20')
	})
})

describe('restoreBackup', () => {
	it('restores a backed up file', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(path.join(tmpDir, 'test.txt'), 'original')
			await backupFile(tmpDir, 'test.txt')

			await fs.writeFile(path.join(tmpDir, 'test.txt'), 'modified')
			const backups = await listBackups(tmpDir, 'test.txt')
			expect(backups.length).toBe(1)

			await restoreBackup(tmpDir, backups[0])
			const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8')
			expect(content).toBe('original')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('restores the most recent backup', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(path.join(tmpDir, 'test.txt'), 'v1')
			await backupFile(tmpDir, 'test.txt')

			await fs.writeFile(path.join(tmpDir, 'test.txt'), 'v2')
			await backupFile(tmpDir, 'test.txt')

			await fs.writeFile(path.join(tmpDir, 'test.txt'), 'v3')
			const backups = await listBackups(tmpDir, 'test.txt')
			expect(backups.length).toBe(2)

			await restoreBackup(tmpDir, backups[0])
			const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8')
			expect(content).toBe('v2')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})
