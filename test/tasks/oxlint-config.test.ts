import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { oxfmtTask, oxlintTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

const toolTimeout = 30_000

describe('oxlint config validation', () => {
	it('generated oxlint.config.ts has expected imports and rules', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const diffs = await oxlintTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === 'oxlint.config.ts')
		if (!configFile) throw new Error('Expected oxlint.config.ts diff to exist')
		expect(configFile.before).toBeNull()

		const content = configFile.after

		// Imports
		expect(content).toContain('import { defineConfig } from "oxlint"')
		expect(content).toContain('import core from "ultracite/oxlint/core"')

		// Core rules
		expect(content).toContain('"no-console"')
		expect(content).toContain('"no-shadow"')

		// Overrides
		expect(content).toContain('overrides')
		expect(content).toContain('"*.test.ts"')
		expect(content).toContain('"@typescript-eslint/no-explicit-any"')
	})

	it(
		'generated oxlint.config.json is merged correctly with existing config and accepted by oxlint',
		async () => {
			const testDir = path.join(fixtures, 'vite-plus-oxlint')
			const profile = await detectProject(testDir)
			const diffs = await oxlintTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === 'oxlint.config.json')
			if (!configFile)
				throw new Error('Expected oxlint.config.json diff to exist')

			const config = JSON.parse(configFile.after)

			// Original rules preserved (mergeJson keeps existing scalars)
			expect(config.rules['no-console']).toBe('error')
			expect(config.rules['no-unused-vars']).toBe('off')
			expect(config.rules.complexity).toEqual(['warn', { max: 30 }])

			// TypeScript rules
			expect(
				Array.isArray(
					config.rules['@typescript-eslint/consistent-type-imports'],
				),
			).toBe(true)

			// Categories
			expect(config.categories).toEqual({
				correctness: 'error',
				suspicious: 'warn',
				style: 'warn',
				perf: 'warn',
			})

			// Overrides
			expect(config.overrides).toBeDefined()
			expect(config.overrides[0].files).toContain('*.test.ts')

			// Write merged config to temp dir and validate with oxlint
			const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
			const { join } = await import('node:path')
			const { tmpdir } = await import('node:os')
			const { execSync } = await import('node:child_process')

			const tmpDir = await mkdtemp(join(tmpdir(), 'oxlint-validate-'))
			await writeFile(join(tmpDir, 'oxlint.config.json'), configFile.after)
			await writeFile(
				join(tmpDir, 'test.ts'),
				'const x: number = 1;\nconsole.log(x);\n',
			)

			try {
				execSync(
					`npx -y oxlint@latest --config ${join(tmpDir, 'oxlint.config.json')} ${join(tmpDir, 'test.ts')}`,
					{ cwd: tmpDir, stdio: 'pipe', timeout: toolTimeout },
				)
			} catch (e: unknown) {
				const stderr = (
					(e as { stderr?: Buffer })?.stderr ?? Buffer.from('')
				).toString()
				if (stderr.includes('Failed to parse')) {
					throw new Error(`oxlint rejected generated config: ${stderr}`)
				}
			}

			await rm(tmpDir, { recursive: true, force: true })
		},
		toolTimeout,
	)

	it('includes ultracite react preset when framework is react', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const diffs = await oxlintTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === 'oxlint.config.ts')

		if (!configFile) throw new Error('Expected oxlint.config.ts diff to exist')
		const content = configFile.after
		expect(content).toContain('import react from "ultracite/oxlint/react"')
		expect(content).toContain('extends: [core, react]')
		expect(content).toContain('"no-console"')
		expect(content).toContain('"no-shadow"')
	})
})

describe('oxfmt config validation', () => {
	it('generated oxfmt.config.ts has expected imports and options', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const diffs = await oxfmtTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === 'oxfmt.config.ts')

		if (!configFile) throw new Error('Expected oxfmt.config.ts diff to exist')
		expect(configFile.before).toBeNull()

		const content = configFile.after
		expect(content).toContain('import { defineConfig } from "oxfmt"')
		expect(content).toContain('import ultracite from "ultracite/oxfmt"')
		expect(content).toContain('singleQuote: true')
	})

	it(
		'generated oxfmt.config.json is valid and accepted by oxfmt',
		async () => {
			const testDir = path.join(fixtures, 'vite-plus-oxlint')
			const profile = await detectProject(testDir)
			const diffs = await oxfmtTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === 'oxfmt.config.ts')

			if (!configFile) throw new Error('Expected oxfmt.config.ts diff to exist')

			// For new TS format projects, oxfmt generates a TS config
			const content = configFile.after
			expect(content).toContain('defineConfig')
			expect(content).toContain('ultracite')
			expect(content).toContain('singleQuote: true')
		},
		toolTimeout,
	)
})
