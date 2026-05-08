import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { doctorCommand } from '@xtarterize/cli/commands/doctor.js'
import { describe, expect, it } from 'vite-plus/test'

async function createProjectFixture(): Promise<string> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-doctor-'))
	await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true })
	await fs.writeFile(
		path.join(tmpDir, 'package.json'),
		JSON.stringify({
			name: 'doctor-fixture',
			version: '1.0.0',
			devDependencies: { '@biomejs/biome': '^2.0.0' },
		}),
	)
	return tmpDir
}

describe('doctor command', () => {
	it('emits machine-readable diagnostics', async () => {
		const cwd = await createProjectFixture()
		const logs: string[] = []
		const originalLog = console.log
		console.log = (...args: unknown[]) => {
			logs.push(args.map((arg) => String(arg)).join(' '))
		}

		try {
			await doctorCommand.run?.({ args: { cwd, json: true } } as never)
		} finally {
			console.log = originalLog
		}

		expect(logs.length).toBeGreaterThan(0)
		const payload = JSON.parse(logs[logs.length - 1]) as {
			ok: boolean
			summary: { total: number }
			diagnostics: Array<{ name: string; status: string; message: string }>
		}

		expect(payload.ok).toBe(true)
		expect(payload.summary.total).toBeGreaterThan(0)
		expect(Array.isArray(payload.diagnostics)).toBe(true)
	})
})
