import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { addCommand } from '@xtarterize/app/commands/add.js'
import { restoreCommand } from '@xtarterize/app/commands/restore.js'
import { syncCommand } from '@xtarterize/app/commands/sync.js'
import { undoCommand } from '@xtarterize/app/commands/undo.js'
import {
	backupFile,
	consola,
	readRunManifest,
	writeRunManifest,
} from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capture all stdout + stderr from a command (including consola output). */
async function captureOutput(run: () => Promise<void>): Promise<string> {
	const chunks: Buffer[] = []
	const originalOut = process.stdout.write.bind(process.stdout)
	const originalErr = process.stderr.write.bind(process.stderr)

	function collect(chunk: string | Uint8Array): boolean {
		chunks.push(Buffer.from(chunk))
		return true
	}

	// biome-ignore lint/suspicious/noExplicitAny: stdout mock needs any cast
	process.stdout.write = collect as any
	// biome-ignore lint/suspicious/noExplicitAny: stderr mock needs any cast
	process.stderr.write = collect as any

	const originalLevel = consola.level
	consola.level = 5

	try {
		await run()
	} finally {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		process.stdout.write = originalOut
		// eslint-disable-next-line @typescript-eslint/unbound-method
		process.stderr.write = originalErr
		consola.level = originalLevel
	}

	return Buffer.concat(chunks).toString('utf-8')
}

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
		try {
			// On a minimal project all tasks are 'new' or 'skip';
			// sync only acts on 'patch'/'conflict', so it runs without error.
			await syncCommand.run?.({ args: { cwd, yes: true } } as never)
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

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

			const output = await captureOutput(async () => {
				await syncCommand.run?.({ args: { cwd, yes: true } } as never)
			})
			// Should have applied tasks
			expect(output).toMatch(/Applied|patch/)
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)
})

describe('add command', () => {
	it('applies a valid task ID', async () => {
		const cwd = await createMinimalProject()
		try {
			await addCommand.run?.({
				args: { cwd, taskId: 'release/czg', quiet: true },
			} as never)

			const pkg = JSON.parse(
				await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'),
			)
			expect(pkg.scripts?.commit).toBe('czg')
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('handles invalid task ID gracefully', async () => {
		const cwd = await createMinimalProject()
		try {
			// Should not throw — just logs an error
			await addCommand.run?.({
				args: { cwd, taskId: 'nonexistent/task', quiet: true },
			} as never)
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

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

			// Apply again — should be idempotent
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
	})
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

	it('handles missing manifest gracefully', async () => {
		const cwd = await createMinimalProject()
		try {
			const manifest = await readRunManifest(cwd)
			expect(manifest).toBeNull()

			// Should not throw — just logs an error
			await undoCommand.run?.({ args: { cwd, quiet: true } } as never)
		} finally {
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
			// Should not throw — just logs an error
			await restoreCommand.run?.({
				args: { cwd, filepath: 'nonexistent.txt' },
			} as never)
		} finally {
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})
})
