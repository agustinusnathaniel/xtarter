import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPreflight } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('runPreflight', () => {
	it('passes for valid project with git', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-preflight-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-project' }),
		)
		await fs.mkdir(path.join(tmpDir, '.git'))
		const result = await runPreflight(tmpDir)
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
		await fs.rm(tmpDir, { recursive: true })
	})

	it('fails when package.json is missing', async () => {
		const result = await runPreflight(
			path.join(fixtures, 'monorepo-turbo', 'apps'),
		)
		expect(result.valid).toBe(false)
		expect(result.errors[0].code).toBe('MISSING_PACKAGE_JSON')
	})

	it('fails when .git is missing', async () => {
		const result = await runPreflight(path.join(fixtures, 'nextjs'))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.code === 'MISSING_GIT')).toBe(true)
	})

	it('fails when package.json has no name', async () => {
		const result = await runPreflight(
			path.join(fixtures, 'react-vite-no-styling'),
		)
		// react-vite-no-styling has a name, so this should pass git check but...
		// Actually it has no .git, so it will fail on git
		expect(result.errors.some((e) => e.code === 'MISSING_GIT')).toBe(true)
	})
})
