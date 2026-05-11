import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { doctorCommand } from '@xtarterize/app/commands/doctor.js'
import { describe, expect, it } from 'vite-plus/test'

async function createProjectFixture(): Promise<string> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-doctor-'))
	await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true })
	await fs.writeFile(
		path.join(tmpDir, 'package.json'),
		JSON.stringify({
			name: 'doctor-fixture',
			version: '1.0.0',
			devDependencies: {
				'@biomejs/biome': '^2.0.0',
				typescript: '^5.3.0',
			},
		}),
	)
	return tmpDir
}

function captureLogs<T>(fn: () => Promise<T>): {
	logs: string[]
	result: Promise<T>
} {
	const logs: string[] = []
	const originalLog = console.log
	console.log = (...args: unknown[]) => {
		logs.push(args.map((arg) => String(arg)).join(' '))
	}
	const result = fn().finally(() => {
		console.log = originalLog
	})
	return { logs, result }
}

describe('doctor command', () => {
	it('emits machine-readable diagnostics in JSON mode', async () => {
		const cwd = await createProjectFixture()
		const { logs, result } = captureLogs(() =>
			doctorCommand.run?.({ args: { cwd, json: true } } as never),
		)
		await result

		expect(logs.length).toBeGreaterThan(0)
		const payload = JSON.parse(logs[logs.length - 1]) as {
			ok: boolean
			summary: { total: number; pass: number; warn: number; fail: number }
			diagnostics: Array<{ name: string; status: string; message: string }>
		}

		expect(payload.ok).toBe(true)
		expect(payload.summary.total).toBeGreaterThan(0)
		expect(payload.diagnostics.length).toBe(payload.summary.total)
		expect(Array.isArray(payload.diagnostics)).toBe(true)
	})

	it('outputs summary line in quiet mode', async () => {
		const cwd = await createProjectFixture()
		const { logs, result } = captureLogs(() =>
			doctorCommand.run?.({ args: { cwd, quiet: true } } as never),
		)
		await result

		expect(logs.length).toBeGreaterThan(0)
		const lastLine = logs[logs.length - 1]
		expect(lastLine).toMatch(/\d+ passed/)
	})

	it('includes system info in verbose mode', async () => {
		const cwd = await createProjectFixture()
		const { logs, result } = captureLogs(() =>
			doctorCommand.run?.({ args: { cwd, verbose: true } } as never),
		)
		await result

		const fullOutput = logs.join(' ')
		expect(fullOutput).toContain('System')
		expect(fullOutput).toMatch(/(CPUs|GB RAM)/)
	})

	it('includes project health diagnostics', async () => {
		const cwd = await createProjectFixture()
		// Add a tsconfig.json to make the TypeScript check pass
		await fs.writeFile(path.join(cwd, 'tsconfig.json'), JSON.stringify({}))

		const { logs, result } = captureLogs(() =>
			doctorCommand.run?.({ args: { cwd, json: true } } as never),
		)
		await result

		const payload = JSON.parse(logs[logs.length - 1]) as {
			diagnostics: Array<{ name: string; message: string }>
		}

		const tsCheck = payload.diagnostics.find(
			(d) => d.name === 'TypeScript config',
		)
		expect(tsCheck).toBeDefined()
		expect(tsCheck?.message).toContain('tsconfig.json')
	})
})
