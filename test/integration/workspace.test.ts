import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectProject } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

describe('pnpm workspace root', () => {
	it('detects workspace root and handles task apply correctly', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-workspace-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify(
					{
						name: 'test-workspace',
						scripts: {},
						devDependencies: {
							czg: '^1.0.0',
						},
					},
					null,
					2,
				),
			)
			await fs.writeFile(
				path.join(tmpDir, 'pnpm-workspace.yaml'),
				'packages:\n  - "packages/*"\n',
			)

			const profile = await detectProject(tmpDir)
			expect(profile.workspaceRoot).toBe(true)
			expect(profile.packageManager).toBe('pnpm')

			const { czgTask } = await import('@xtarterize/tasks')
			const status = await czgTask.check(tmpDir, profile)
			expect(status).toBe('patch')

			const diffs = await czgTask.dryRun(tmpDir, profile)
			const pkgDiff = diffs.find((d) => d.filepath === 'package.json')
			expect(pkgDiff?.after).toContain('"commit": "czg"')

			await czgTask.apply(tmpDir, profile)

			const pkg = JSON.parse(
				await fs.readFile(path.join(tmpDir, 'package.json'), 'utf-8'),
			)
			expect(pkg.scripts?.commit).toBe('czg')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('sets workspaceRoot to false without pnpm-workspace.yaml', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-nonworkspace-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'test-nonworkspace' }, null, 2),
			)

			const profile = await detectProject(tmpDir)
			expect(profile.workspaceRoot).toBe(false)
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})
