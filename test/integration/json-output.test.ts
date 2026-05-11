import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { checkCommand } from '@xtarterize/app/commands/check.js'
import { diffCommand } from '@xtarterize/app/commands/diff.js'
import { listCommand } from '@xtarterize/app/commands/list.js'
import { describe, expect, it } from 'vite-plus/test'

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
	return JSON.parse(logs[logs.length - 1])
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

		expect(output.ok).toBe(true)
		expect(output.summary.total).toBeGreaterThan(0)
		expect(Array.isArray(output.tasks)).toBe(true)
		expect(Array.isArray(output.diagnostics)).toBe(true)

		await fs.rm(cwd, { recursive: true, force: true })
	})

	it('diff command emits machine-readable payload', async () => {
		const cwd = await createProjectFixture()
		const output = (await captureJsonOutput(async () => {
			await diffCommand.run?.({ args: { cwd, json: true } } as never)
		})) as {
			ok: boolean
			count: number
			diffs: Array<{ filepath: string; before: string | null; after: string }>
		}

		expect(output.ok).toBe(true)
		expect(output.count).toBeGreaterThanOrEqual(0)
		expect(Array.isArray(output.diffs)).toBe(true)
		if (output.diffs.length > 0) {
			expect(typeof output.diffs[0]?.filepath).toBe('string')
			expect(typeof output.diffs[0]?.after).toBe('string')
		}

		await fs.rm(cwd, { recursive: true, force: true })
	})
})
