import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { addCommand } from '@xtarterize/app/commands/add.js'
import { initCommand } from '@xtarterize/app/commands/init.js'
import { restoreCommand } from '@xtarterize/app/commands/restore.js'
import { syncCommand } from '@xtarterize/app/commands/sync.js'
import { undoCommand } from '@xtarterize/app/commands/undo.js'
import { backupFile, readRunManifest, writeRunManifest } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

async function createMinimalProject(): Promise<string> {
	const tmpDir = await fs.mkdtemp(
		path.join(os.tmpdir(), 'xtarterize-cmd-test-'),
	)
	await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true })
	await fs.writeFile(
		path.join(tmpDir, 'package.json'),
		JSON.stringify({
			name: 'cmd-test-fixture',
			version: '1.0.0',
			type: 'module',
			dependencies: { react: '^18.2.0' },
			devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
		}),
	)
	return tmpDir
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sync command', () => {
	it('exits cleanly on unchanged project', async () => {
		const cwd = await createMinimalProject()
		process.exitCode = 0
		try {
			// On a minimal project all tasks are 'new' or 'skip';
			// sync only acts on 'patch'/'conflict', so it runs without error.
			await syncCommand.run?.({ args: { cwd, yes: true } } as never)
			expect(process.exitCode).toBe(0)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 30_000)

	it('detects outdated config and applies updates', async () => {
		const cwd = await createMinimalProject()
		try {
			await fs.writeFile(
				path.join(cwd, 'biome.json'),
				JSON.stringify({
					$schema: './node_modules/@biomejs/biome/configuration_schema.json',
					linter: { enabled: true, rules: { recommended: true } },
					formatter: { enabled: false },
				}),
			)

			await syncCommand.run?.({ args: { cwd, yes: true } } as never)

			const biome = JSON.parse(
				await fs.readFile(path.join(cwd, 'biome.json'), 'utf-8'),
			)
			expect(biome.vcs).toBeDefined()
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)

	it('dry-run exits 1 when pending changes exist', async () => {
		const cwd = await createMinimalProject()
		process.exitCode = 0
		try {
			await fs.writeFile(
				path.join(cwd, 'biome.json'),
				JSON.stringify({
					$schema: './node_modules/@biomejs/biome/configuration_schema.json',
					linter: { enabled: true, rules: { recommended: true } },
					formatter: { enabled: false },
				}),
			)

			await syncCommand.run?.({
				args: { cwd, dryRun: true, quiet: true },
			} as never)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)

	it('applies conflicting tasks when --include-conflicts is passed with --yes', async () => {
		const cwd = await createMinimalProject()
		process.exitCode = 0
		try {
			// ts/strict reports 'conflict' when the existing config sets a
			// compiler option to a different value (strict: false).
			await fs.writeFile(
				path.join(cwd, 'tsconfig.json'),
				'{"compilerOptions":{"strict":false}}\n',
			)

			await syncCommand.run?.({
				args: { cwd, yes: true, includeConflicts: true },
			} as never)

			// Applying the conflict must add the missing strict options.
			// defu preserves the user's `strict: false`, so assert on a key
			// that is only present after the conflict is applied.
			const tsconfig = JSON.parse(
				await fs.readFile(path.join(cwd, 'tsconfig.json'), 'utf-8'),
			)
			expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)
})

describe('init command', () => {
	it('dry-run exits 1 when tasks are pending', async () => {
		const cwd = await createMinimalProject()
		process.exitCode = 0
		try {
			await initCommand.run?.({
				args: { cwd, dryRun: true, quiet: true },
			} as never)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)
})

describe('add command', () => {
	it('applies a valid task ID', async () => {
		const cwd = await createMinimalProject()
		process.exitCode = 0
		try {
			await addCommand.run?.({
				args: { cwd, taskId: 'release/czg', quiet: true },
			} as never)

			const pkg = JSON.parse(
				await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'),
			)
			expect(pkg.scripts?.commit).toBe('czg')
			expect(process.exitCode).toBe(0)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)

	it('handles invalid task ID gracefully', async () => {
		const cwd = await createMinimalProject()
		try {
			// Should not throw - just logs an error
			await addCommand.run?.({
				args: { cwd, taskId: 'nonexistent/task', quiet: true },
			} as never)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('reports conflict tasks as not applied and exits 1', async () => {
		const cwd = await createMinimalProject()
		process.exitCode = 0
		try {
			const tsconfigPath = path.join(cwd, 'tsconfig.json')
			const original = '{"compilerOptions":{"strict":false}}\n'
			await fs.writeFile(tsconfigPath, original)

			await addCommand.run?.({
				args: { cwd, taskId: 'ts/strict', quiet: true },
			} as never)

			expect(process.exitCode).toBe(1)
			// The conflicting file must NOT have been overwritten
			const tsconfig = await fs.readFile(tsconfigPath, 'utf-8')
			expect(tsconfig).toBe(original)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)

	it('skips already-configured task', async () => {
		const cwd = await createMinimalProject()
		try {
			// First apply czg
			await addCommand.run?.({
				args: { cwd, taskId: 'release/czg', quiet: true },
			} as never)

			const pkgBefore = JSON.parse(
				await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'),
			)

			// Apply again - should be idempotent
			await addCommand.run?.({
				args: { cwd, taskId: 'release/czg', quiet: true },
			} as never)

			const pkgAfter = JSON.parse(
				await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'),
			)
			expect(pkgAfter.scripts).toEqual(pkgBefore.scripts)
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)
})

describe('undo command', () => {
	it('reverts the last run', async () => {
		const cwd = await createMinimalProject()
		try {
			await fs.writeFile(path.join(cwd, 'test.txt'), 'original content')
			await backupFile(cwd, 'test.txt')
			await writeRunManifest(cwd, ['test.txt'])
			await fs.writeFile(path.join(cwd, 'test.txt'), 'modified content')

			await undoCommand.run?.({ args: { cwd, quiet: true } } as never)

			const content = await fs.readFile(path.join(cwd, 'test.txt'), 'utf-8')
			expect(content).toBe('original content')
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('removes files that were created by the run (no backup exists)', async () => {
		const cwd = await createMinimalProject()
		try {
			// Simulate a run that created a brand-new file: the manifest
			// lists it, but backupFile skipped it because it did not exist.
			await fs.writeFile(path.join(cwd, 'created.txt'), 'new content')
			await writeRunManifest(cwd, ['created.txt'])

			await undoCommand.run?.({ args: { cwd, quiet: true } } as never)

			await expect(fs.access(path.join(cwd, 'created.txt'))).rejects.toThrow()
			expect(process.exitCode).toBe(0)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('handles missing manifest gracefully', async () => {
		const cwd = await createMinimalProject()
		try {
			const manifest = await readRunManifest(cwd)
			expect(manifest).toBeNull()

			// Should not throw - just logs an error
			await undoCommand.run?.({ args: { cwd, quiet: true } } as never)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})
})

describe('restore command', () => {
	it('restores a specific file from backup', async () => {
		const cwd = await createMinimalProject()
		try {
			await fs.writeFile(path.join(cwd, 'restore-me.txt'), 'original text')
			await backupFile(cwd, 'restore-me.txt')
			await fs.writeFile(path.join(cwd, 'restore-me.txt'), 'modified text')

			await restoreCommand.run?.({
				args: { cwd, filepath: 'restore-me.txt' },
			} as never)

			const content = await fs.readFile(
				path.join(cwd, 'restore-me.txt'),
				'utf-8',
			)
			expect(content).toBe('original text')
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('handles missing backups gracefully', async () => {
		const cwd = await createMinimalProject()
		try {
			// Should not throw - just logs an error
			await restoreCommand.run?.({
				args: { cwd, filepath: 'nonexistent.txt' },
			} as never)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})
})
