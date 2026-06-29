import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	biomeTask,
	oxfmtTask,
	oxlintTask,
	renovateTask,
	vscodeTask,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

const toolTimeout = 30_000

describe('biome config validation', () => {
	it('rendered biome.json is valid JSON with expected structure', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		const diffs = await biomeTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === 'biome.json')
		if (!configFile) throw new Error('Expected biome.json diff to exist')

		const config = JSON.parse(configFile.after)
		expect(config.formatter.indentStyle).toBe('space')
		expect(config.linter.rules.style.useConsistentTypeDefinitions).toBe('off')
		expect(config.javascript.formatter.quoteStyle).toBe('single')
	})

	it(
		'rendered biome.json is accepted by biome CLI',
		async () => {
			const testDir = path.join(fixtures, 'react-vite-tailwind')
			const profile = await detectProject(testDir)
			const diffs = await biomeTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === 'biome.json')
			if (!configFile) throw new Error('Expected biome.json diff to exist')
			const config = configFile.after

			const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
			const { join } = await import('node:path')
			const { tmpdir } = await import('node:os')
			const { execSync } = await import('node:child_process')

			const tmpDir = await mkdtemp(join(tmpdir(), 'biome-validate-'))
			await writeFile(join(tmpDir, 'biome.json'), config)
			await writeFile(join(tmpDir, '.gitignore'), '')
			await writeFile(join(tmpDir, 'test.js'), 'const x = 1\n')

			try {
				execSync(
					`npx -y @biomejs/biome@2.4.16 check --config-path=${tmpDir} --no-errors-on-unmatched ${join(tmpDir, 'test.js')}`,
					{ cwd: tmpDir, stdio: 'pipe', timeout: toolTimeout },
				)
			} catch (e: unknown) {
				const stderr = (
					(e as { stderr?: Buffer })?.stderr ?? Buffer.from('')
				).toString()
				if (
					stderr.includes('resulted in errors') ||
					stderr.includes('Failed to parse')
				) {
					throw new Error(`biome rejected generated config: ${stderr}`)
				}
			}

			await rm(tmpDir, { recursive: true, force: true })
		},
		toolTimeout,
	)

	it('includes css.tailwindDirectives for tailwind projects', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		const diffs = await biomeTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === 'biome.json')
		if (!configFile) throw new Error('Expected biome.json diff to exist')

		const config = JSON.parse(configFile.after)
		expect(config.css?.parser?.tailwindDirectives).toBe(true)
	})
})

describe('renovate config validation', () => {
	it('rendered renovate.json is valid JSON', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		const diffs = await renovateTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === 'renovate.json')

		if (!configFile) throw new Error('Expected renovate.json diff to exist')
		expect(() => JSON.parse(configFile.after)).not.toThrow()
		const config = JSON.parse(configFile.after)
		expect(config.$schema).toBeDefined()
	})
})

describe('vscode config validation', () => {
	it('rendered .vscode/settings.json is valid JSON', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		const diffs = await vscodeTask.dryRun(testDir, profile)
		const settingsFile = diffs.find((d) => d.filepath.endsWith('settings.json'))

		if (!settingsFile) throw new Error('Expected settings.json diff to exist')
		expect(() => JSON.parse(settingsFile.after)).not.toThrow()
	})
})

describe('all config templates render without runtime errors', () => {
	it('all lint tool configs render for a Vite+ project', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const results = await Promise.allSettled([
			oxlintTask.dryRun(testDir, profile),
			oxfmtTask.dryRun(testDir, profile),
		])

		for (const result of results) {
			if (result.status === 'rejected') {
				throw new Error(`Template render failed: ${result.reason}`)
			}
		}
	})

	it('all lint tool configs render for a non-Vite+ project', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		const results = await Promise.allSettled([
			biomeTask.dryRun(testDir, profile),
			renovateTask.dryRun(testDir, profile),
			vscodeTask.dryRun(testDir, profile),
		])

		for (const result of results) {
			if (result.status === 'rejected') {
				throw new Error(`Template render failed: ${result.reason}`)
			}
		}
	})
})
