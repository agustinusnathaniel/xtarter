import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { installDependency } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('installDependency', () => {
	it('early-returns when dependency already exists in package.json', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'test-pkg',
					devDependencies: { eslint: '^9.0.0' },
				}),
			)
			// Should resolve (not throw) because eslint is already listed
			await expect(
				installDependency(tmpDir, 'eslint', true),
			).resolves.toBeUndefined()
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('throws on installation failure', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({
					name: 'test-pkg',
				}),
			)
			// nypm will fail because there's no real package manager context in tests
			await expect(
				installDependency(tmpDir, 'nonexistent-package-that-will-fail', true),
			).rejects.toThrow(/nonexistent-package-that-will-fail/)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})
