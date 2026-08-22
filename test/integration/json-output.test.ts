import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { addCommand } from '@xtarterize/app/commands/add.js'
import { checkCommand } from '@xtarterize/app/commands/check.js'
import { diffCommand } from '@xtarterize/app/commands/diff.js'
import { initCommand } from '@xtarterize/app/commands/init.js'
import { listCommand } from '@xtarterize/app/commands/list.js'
import { restoreCommand } from '@xtarterize/app/commands/restore.js'
import { syncCommand } from '@xtarterize/app/commands/sync.js'
import { undoCommand } from '@xtarterize/app/commands/undo.js'
import { backupFile, writeRunManifest } from '@xtarterize/core'
import { describe, expect, it, vi } from 'vite-plus/test'

const CONFORMANCE_SUMMARY_REGEX = /conformant|Conformance audit/

async function createProjectFixture(): Promise<string> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-json-'))
	await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true })
	await fs.writeFile(
		path.join(tmpDir, 'package.json'),
		JSON.stringify({
			name: 'json-output-fixture',
			version: '1.0.0',
			type: 'module',
			dependencies: { react: '^18.2.0' },
			devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
		}),
	)
	await fs.writeFile(
		path.join(tmpDir, 'tsconfig.json'),
		'{"compilerOptions":{}}\n',
	)
	await fs.writeFile(path.join(tmpDir, 'vite.config.ts'), 'export default {}\n')
	return tmpDir
}

async function createMinimalProject(): Promise<string> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-json-'))
	await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true })
	await fs.writeFile(
		path.join(tmpDir, 'package.json'),
		JSON.stringify({
			name: 'json-output-fixture',
			version: '1.0.0',
			type: 'module',
			dependencies: { react: '^18.2.0' },
			devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' },
		}),
	)
	return tmpDir
}

async function captureConsoleLogs(run: () => Promise<void>): Promise<string[]> {
	const logs: string[] = []
	const originalLog = console.log
	console.log = (...args: unknown[]) => {
		logs.push(args.map((arg) => String(arg)).join(' '))
	}

	try {
		await run()
	} finally {
		console.log = originalLog
	}

	return logs
}

async function captureJsonOutput(run: () => Promise<void>): Promise<unknown> {
	const logs: string[] = []
	const originalLog = console.log
	console.log = (...args: unknown[]) => {
		logs.push(args.map((arg) => String(arg)).join(' '))
	}

	try {
		await run()
	} finally {
		console.log = originalLog
	}

	expect(logs.length).toBeGreaterThan(0)
	// The payload must be the FIRST thing on stdout — a leading blank line
	// or human text breaks the machine-readable contract for CI consumers.
	const payload = logs.find((line) => line.trim().startsWith('{'))
	expect(payload).toBe(logs[0])
	return JSON.parse(payload ?? '')
}

describe('cli json output', () => {
	it('list command emits machine-readable payload', async () => {
		const cwd = await createProjectFixture()
		const output = (await captureJsonOutput(async () => {
			await listCommand.run?.({ args: { cwd, json: true } } as never)
		})) as {
			ok: boolean
			profile: Record<string, unknown>
			tasks: Array<{ id: string; status: string }>
		}

		expect(output.ok).toBe(true)
		expect(output.profile).toBeTruthy()
		expect(Array.isArray(output.tasks)).toBe(true)
		expect(output.tasks.length).toBeGreaterThan(0)
		expect(typeof output.tasks[0]?.id).toBe('string')
		expect(typeof output.tasks[0]?.status).toBe('string')

		await fs.rm(cwd, { recursive: true, force: true })
	})

	it('check command emits machine-readable payload', async () => {
		const cwd = await createProjectFixture()
		const output = (await captureJsonOutput(async () => {
			await checkCommand.run?.({ args: { cwd, json: true } } as never)
		})) as {
			ok: boolean
			summary: { conformant: number; total: number }
			tasks: Array<{ id: string; status: string }>
			diagnostics: Array<{ name: string; status: string; message: string }>
		}

		expect(output.ok).toBe(false)
		expect(output.summary.total).toBeGreaterThan(0)
		expect(Array.isArray(output.tasks)).toBe(true)
		expect(Array.isArray(output.diagnostics)).toBe(true)

		expect(process.exitCode).toBe(1)
		process.exitCode = 0

		await fs.rm(cwd, { recursive: true, force: true })
	})

	it('diff command emits machine-readable payload', async () => {
		const cwd = await createProjectFixture()
		const output = (await captureJsonOutput(async () => {
			await diffCommand.run?.({ args: { cwd, json: true } } as never)
		})) as {
			ok: boolean
			summary: { total: number; stats?: { added: number; removed: number } }
			files: Array<{
				filepath: string
				action: string
				before?: string
				after: string
				stats?: { added: number; removed: number }
				hunks?: Array<{ header: string; added: number; removed: number }>
			}>
		}

		expect(output.ok).toBe(false)
		expect(output.summary.total).toBeGreaterThanOrEqual(0)
		expect(Array.isArray(output.files)).toBe(true)
		if (output.files.length > 0) {
			expect(typeof output.files[0]?.filepath).toBe('string')
			expect(typeof output.files[0]?.after).toBe('string')
		}

		await fs.rm(cwd, { recursive: true, force: true })
	})

	it('diff command exits 1 when pending changes exist', async () => {
		const cwd = await createProjectFixture()
		try {
			await diffCommand.run?.({ args: { cwd, json: true } } as never)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('diff command JSON ok field agrees with exit code', async () => {
		const cwd = await createProjectFixture()
		const output = (await captureJsonOutput(async () => {
			await diffCommand.run?.({ args: { cwd, json: true } } as never)
		})) as { ok: boolean }
		expect(output.ok).toBe(false)
		expect(process.exitCode).toBe(1)
		process.exitCode = 0
		await fs.rm(cwd, { recursive: true, force: true })
	})
})

it('check --json keeps stdout machine-readable when annotations are enabled', async () => {
	const cwd = await createProjectFixture()
	const stdoutChunks: string[] = []
	const stderrChunks: string[] = []
	const stdoutSpy = vi
		.spyOn(process.stdout, 'write')
		.mockImplementation((chunk: unknown) => {
			stdoutChunks.push(String(chunk))
			return true
		})
	const stderrSpy = vi
		.spyOn(process.stderr, 'write')
		.mockImplementation((chunk: unknown) => {
			stderrChunks.push(String(chunk))
			return true
		})

	try {
		await captureJsonOutput(async () => {
			await checkCommand.run?.({
				args: { cwd, json: true, annotations: true },
			} as never)
		})

		// Annotations must not pollute the machine-readable stdout stream
		expect(stdoutChunks.join('')).not.toContain('::')
		// Annotations are emitted on stderr (parsed by the Actions runner)
		expect(stderrChunks.join('')).toContain('::error')
	} finally {
		stdoutSpy.mockRestore()
		stderrSpy.mockRestore()
		process.exitCode = 0
		await fs.rm(cwd, { recursive: true, force: true })
	}
})

it('check --badge - --json keeps stdout a valid JSON payload', async () => {
	const cwd = await createProjectFixture()
	const stdoutChunks: string[] = []
	const stderrChunks: string[] = []
	const stdoutSpy = vi
		.spyOn(process.stdout, 'write')
		.mockImplementation((chunk: unknown) => {
			stdoutChunks.push(String(chunk))
			return true
		})
	const stderrSpy = vi
		.spyOn(process.stderr, 'write')
		.mockImplementation((chunk: unknown) => {
			stderrChunks.push(String(chunk))
			return true
		})

	try {
		const output = await captureJsonOutput(async () => {
			await checkCommand.run?.({
				args: { cwd, json: true, badge: '-' },
			} as never)
		})

		// The badge SVG must not pollute the machine-readable stdout stream
		expect(stdoutChunks.join('')).not.toContain('<svg')
		// The badge SVG is emitted on stderr alongside annotations
		expect(stderrChunks.join('')).toContain('<svg')
		expect(typeof output).toBe('object')
	} finally {
		stdoutSpy.mockRestore()
		stderrSpy.mockRestore()
		process.exitCode = 0
		await fs.rm(cwd, { recursive: true, force: true })
	}
})

it('check --badge <file> --json writes the badge and keeps stdout a valid JSON payload', async () => {
	const cwd = await createProjectFixture()
	const badgePath = path.join(cwd, 'conformance.svg')
	const stdoutChunks: string[] = []
	const stdoutSpy = vi
		.spyOn(process.stdout, 'write')
		.mockImplementation((chunk: unknown) => {
			stdoutChunks.push(String(chunk))
			return true
		})

	try {
		const output = await captureJsonOutput(async () => {
			await checkCommand.run?.({
				args: { cwd, json: true, badge: badgePath },
			} as never)
		})

		// The "Badge written" success message must not break the JSON payload
		expect(stdoutChunks.join('')).not.toContain('Badge written')
		expect(typeof output).toBe('object')

		const svg = await fs.readFile(badgePath, 'utf-8')
		expect(svg).toContain('<svg')
	} finally {
		stdoutSpy.mockRestore()
		process.exitCode = 0
		await fs.rm(cwd, { recursive: true, force: true })
	}
})

it('check --badge - keeps stdout a clean SVG and routes the audit to stderr', async () => {
	const cwd = await createProjectFixture()
	const stdoutChunks: string[] = []
	const stderrChunks: string[] = []
	const stdoutSpy = vi
		.spyOn(process.stdout, 'write')
		.mockImplementation((chunk: unknown) => {
			stdoutChunks.push(String(chunk))
			return true
		})
	const stderrSpy = vi
		.spyOn(process.stderr, 'write')
		.mockImplementation((chunk: unknown) => {
			stderrChunks.push(String(chunk))
			return true
		})

	try {
		await checkCommand.run?.({
			args: { cwd, badge: '-' },
		} as never)

		const stdout = stdoutChunks.join('')
		const stderr = stderrChunks.join('')
		expect(stdout.startsWith('<svg')).toBe(true)
		// Nothing may follow the SVG on stdout — the audit goes to stderr.
		expect(stdout.endsWith('</svg>')).toBe(true)
		expect(stdout).not.toContain('Conformance audit')
		// In CI, quiet mode is auto-enabled so the audit section is skipped and
		// only the summary line is printed — but it must land on stderr, never
		// after the SVG on stdout.
		expect(stderr).toMatch(CONFORMANCE_SUMMARY_REGEX)
	} finally {
		stdoutSpy.mockRestore()
		stderrSpy.mockRestore()
		process.exitCode = 0
		await fs.rm(cwd, { recursive: true, force: true })
	}
})

describe('init/sync/add json output', () => {
	it('init --dry-run --json emits a single machine-readable JSON payload', async () => {
		const cwd = await createProjectFixture()
		try {
			const logs = await captureConsoleLogs(async () => {
				await initCommand.run?.({
					args: { cwd, dryRun: true, json: true },
				} as never)
			})

			const stdout = logs.join('\n')
			// The diff payload is the only thing on stdout — no human text.
			expect(stdout).not.toContain('Conformance plan')
			expect(stdout).not.toContain('Timing')
			const parsed = JSON.parse(logs[logs.length - 1])
			expect(parsed).toHaveProperty('ok')
			expect(parsed).toHaveProperty('summary')
			expect(parsed).toHaveProperty('files')
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 60_000)

	it('init --yes --json emits an apply result payload', async () => {
		const cwd = await createProjectFixture()
		try {
			const output = (await captureJsonOutput(async () => {
				await initCommand.run?.({
					args: { cwd, yes: true, json: true },
				} as never)
			})) as {
				ok: boolean
				applied: number
				skipped: number
				errors: string[]
			}

			// Apply may fail on dependency install in the sandbox — the
			// payload must still carry the result shape.
			expect(typeof output.ok).toBe('boolean')
			expect(typeof output.applied).toBe('number')
			expect(typeof output.skipped).toBe('number')
			expect(Array.isArray(output.errors)).toBe(true)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 180_000)

	it('add lint/biome --format json emits a result payload', async () => {
		const cwd = await createProjectFixture()
		try {
			const logs = await captureConsoleLogs(async () => {
				await addCommand.run?.({
					args: { cwd, taskId: 'lint/biome', format: 'json', quiet: true },
				} as never)
			})

			const stdout = logs.join('\n')
			expect(stdout).not.toContain('Applied')
			expect(stdout).not.toContain('Available tasks')
			const parsed = JSON.parse(logs[logs.length - 1]) as {
				ok: boolean
				taskId: string
				applied: number
				errors: string[]
			}
			expect(typeof parsed.ok).toBe('boolean')
			expect(parsed.taskId).toBe('lint/biome')
			expect(typeof parsed.applied).toBe('number')
			expect(Array.isArray(parsed.errors)).toBe(true)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 120_000)

	it('add ts/strict --format json emits the payload as the first thing on stdout', async () => {
		const cwd = await createProjectFixture()
		try {
			const output = (await captureJsonOutput(async () => {
				await addCommand.run?.({
					args: { cwd, taskId: 'ts/strict', format: 'json', quiet: true },
				} as never)
			})) as {
				ok: boolean
				taskId: string
				applied: number
				errors: string[]
			}

			// The apply pipeline runs before the payload is emitted — the
			// hardened captureJsonOutput above proves no leading blank line
			// (or human text) precedes it.
			expect(typeof output.ok).toBe('boolean')
			expect(output.taskId).toBe('ts/strict')
			expect(output.applied).toBe(1)
			expect(Array.isArray(output.errors)).toBe(true)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 120_000)

	it('add --all --format json emits a summary payload', async () => {
		const cwd = await createProjectFixture()
		try {
			const output = (await captureJsonOutput(async () => {
				await addCommand.run?.({
					args: { cwd, all: true, format: 'json', quiet: true },
				} as never)
			})) as {
				ok: boolean
				applied: number
				skipped: number
				errors: string[]
			}

			expect(typeof output.ok).toBe('boolean')
			expect(typeof output.applied).toBe('number')
			expect(typeof output.skipped).toBe('number')
			expect(Array.isArray(output.errors)).toBe(true)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 180_000)

	it('sync --yes --json emits a machine-readable result payload with no human text', async () => {
		const cwd = await createMinimalProject()
		try {
			const logs = await captureConsoleLogs(async () => {
				await syncCommand.run?.({
					args: { cwd, yes: true, json: true },
				} as never)
			})

			const stdout = logs.join('\n')
			// The result payload is the only thing on stdout — no human text.
			expect(stdout).not.toContain('No updates available')
			expect(stdout).not.toContain('Applied')
			expect(stdout).not.toContain('Conformance plan')
			expect(stdout).not.toContain('Timing')

			// Parse the last line (the JSON result payload), matching
			// captureJsonOutput's contract.
			const parsed = JSON.parse(logs[logs.length - 1]) as {
				ok: boolean
				applied: number
				skipped: number
				errors: string[]
			}
			expect(typeof parsed.ok).toBe('boolean')
			expect(typeof parsed.applied).toBe('number')
			expect(typeof parsed.skipped).toBe('number')
			expect(Array.isArray(parsed.errors)).toBe(true)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	}, 120_000)
})

describe('undo and restore json output', () => {
	it('undo command emits machine-readable payload', async () => {
		const cwd = await createMinimalProject()
		try {
			await fs.writeFile(
				path.join(cwd, 'vite.config.ts'),
				'export default {}\n',
			)
			await fs.mkdir(path.join(cwd, '.xtarterize', 'backups'), {
				recursive: true,
			})
			await backupFile(cwd, 'vite.config.ts')
			await fs.writeFile(
				path.join(cwd, 'vite.config.ts'),
				'export default { changed: true }\n',
			)
			await fs.writeFile(path.join(cwd, 'newfile.ts'), 'created by run\n')
			await writeRunManifest(cwd, ['vite.config.ts', 'newfile.ts'])

			const output = (await captureJsonOutput(async () => {
				await undoCommand.run?.({ args: { cwd, json: true } } as never)
			})) as {
				ok: boolean
				restored: number
				total: number
				removed?: number
			}

			expect(output.ok).toBe(true)
			expect(output.restored).toBe(2)
			expect(output.total).toBe(2)
			expect(output.removed).toBe(1)

			const restored = await fs.readFile(
				path.join(cwd, 'vite.config.ts'),
				'utf-8',
			)
			expect(restored).toBe('export default {}\n')
			await expect(fs.access(path.join(cwd, 'newfile.ts'))).rejects.toThrow()

			expect(process.exitCode).toBe(0)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('undo command exits 1 when there is nothing to undo', async () => {
		const cwd = await createMinimalProject()
		try {
			const output = (await captureJsonOutput(async () => {
				await undoCommand.run?.({ args: { cwd, json: true } } as never)
			})) as { ok: boolean }

			expect(output.ok).toBe(false)
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('restore command emits machine-readable payload', async () => {
		const cwd = await createMinimalProject()
		try {
			await fs.writeFile(
				path.join(cwd, 'vite.config.ts'),
				'export default {}\n',
			)
			await fs.mkdir(path.join(cwd, '.xtarterize', 'backups'), {
				recursive: true,
			})
			await backupFile(cwd, 'vite.config.ts')
			await fs.writeFile(
				path.join(cwd, 'vite.config.ts'),
				'export default { changed: true }\n',
			)

			const output = (await captureJsonOutput(async () => {
				await restoreCommand.run?.({
					args: { cwd, filepath: 'vite.config.ts', json: true },
				} as never)
			})) as {
				ok: boolean
				filepath: string
				restoredFrom: string
				timestamp: string
			}

			expect(output.ok).toBe(true)
			expect(output.filepath).toBe('vite.config.ts')
			expect(typeof output.restoredFrom).toBe('string')
			expect(typeof output.timestamp).toBe('string')

			const restored = await fs.readFile(
				path.join(cwd, 'vite.config.ts'),
				'utf-8',
			)
			expect(restored).toBe('export default {}\n')

			expect(process.exitCode).toBe(0)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})

	it('restore command exits 1 when no backup exists', async () => {
		const cwd = await createMinimalProject()
		try {
			await fs.writeFile(
				path.join(cwd, 'vite.config.ts'),
				'export default {}\n',
			)

			const output = (await captureJsonOutput(async () => {
				await restoreCommand.run?.({
					args: { cwd, filepath: 'vite.config.ts', json: true },
				} as never)
			})) as { ok: boolean; filepath: string; error: string }

			expect(output.ok).toBe(false)
			expect(output.filepath).toBe('vite.config.ts')
			expect(output.error).toBe('No backups found')
			expect(process.exitCode).toBe(1)
		} finally {
			process.exitCode = 0
			await fs.rm(cwd, { recursive: true, force: true })
		}
	})
})
