import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { oxfmtTask, oxlintTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

const toolTimeout = 30_000

describe('oxlint config validation', () => {
	it('generated .oxlintrc.json is valid JSON with expected rules', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const diffs = await oxlintTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === '.oxlintrc.json')
		if (!configFile) throw new Error('Expected .oxlintrc.json diff to exist')
		expect(configFile.before).toBeNull()

		const config = JSON.parse(configFile.after)

		// Core ESLint rules
		expect(config.rules['no-console']).toEqual([
			'error',
			{ allow: ['info', 'warn', 'error'] },
		])
		expect(config.rules['no-unused-vars']).toBe('off')
		expect(config.rules.complexity).toEqual(['warn', { max: 30 }])
		expect(config.rules['max-params']).toEqual(['error', { max: 3 }])
		expect(config.rules.eqeqeq).toBe('error')
		expect(config.rules['prefer-const']).toBe('error')
		expect(config.rules['no-var']).toBe('error')
		expect(config.rules['prefer-template']).toBe('error')
		expect(config.rules['no-shadow']).toBe('warn')

		// TypeScript rules
		expect(
			Array.isArray(config.rules['@typescript-eslint/no-unused-vars']),
		).toBe(true)
		expect(
			Array.isArray(config.rules['@typescript-eslint/consistent-type-imports']),
		).toBe(true)
		expect(
			config.rules['@typescript-eslint/consistent-type-definitions'],
		).toEqual(['error', 'type'])
		expect(config.rules['@typescript-eslint/array-type']).toEqual([
			'error',
			{ default: 'generic' },
		])

		// Import rules
		expect(config.rules['import/no-duplicates']).toBe('error')
		expect(config.rules['import/first']).toBe('error')
		expect(config.rules['import/prefer-default-export']).toBe('off')

		// Unicorn (relaxed)
		expect(config.rules['unicorn/no-null']).toBe('off')
		expect(config.rules['unicorn/filename-case']).toBe('off')
		expect(config.rules['unicorn/no-array-reduce']).toBe('off')

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
		expect(config.overrides[0].rules['vitest/consistent-test-it']).toEqual([
			'error',
			{ fn: 'it', withinDescribe: 'test' },
		])

		// React (also present because vite-plus-no-lint has react dep)
		expect(Array.isArray(config.rules['react/jsx-key'])).toBe(true)
	})

	it(
		'generated .oxlintrc.json is accepted by oxlint',
		async () => {
			const testDir = path.join(fixtures, 'vite-plus-no-lint')
			const profile = await detectProject(testDir)
			const diffs = await oxlintTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === '.oxlintrc.json')
			if (!configFile) throw new Error('Expected .oxlintrc.json diff to exist')
			const config = configFile.after

			const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
			const { join } = await import('node:path')
			const { tmpdir } = await import('node:os')
			const { execSync } = await import('node:child_process')

			const tmpDir = await mkdtemp(join(tmpdir(), 'oxlint-validate-'))
			await writeFile(join(tmpDir, '.oxlintrc.json'), config)
			await writeFile(
				join(tmpDir, 'test.ts'),
				'const x: number = 1;\nconsole.log(x);\n',
			)

			try {
				execSync(
					`npx -y oxlint@latest --config ${join(tmpDir, '.oxlintrc.json')} ${join(tmpDir, 'test.ts')}`,
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

	it('react rules present when framework is react', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		const diffs = await oxlintTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === '.oxlintrc.json')

		if (!configFile) throw new Error('Expected .oxlintrc.json diff to exist')
		const config = JSON.parse(configFile.after)
		expect(config.rules['jsx-a11y/anchor-is-valid']).toBeDefined()
		expect(config.rules['react/jsx-key']).toBeDefined()
		expect(config.rules['react/jsx-boolean-value']).toBe('error')
		expect(config.rules['react/self-closing-comp']).toBe('error')
		expect(config.rules['react/no-unknown-property']).toBe('error')
		expect(config.rules['jsx-a11y/alt-text']).toBe('error')
		expect(config.plugins).toContain('react')
		expect(config.plugins).toContain('jsx-a11y')
	})
})

describe('oxfmt config validation', () => {
	it('generated .oxfmtrc.json is valid JSON with expected options', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const diffs = await oxfmtTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === '.oxfmtrc.json')

		if (!configFile) throw new Error('Expected .oxfmtrc.json diff to exist')
		expect(configFile.before).toBeNull()

		const config = JSON.parse(configFile.after)
		expect(config.indentStyle).toBe('space')
		expect(config.indentWidth).toBe(2)
		expect(config.lineWidth).toBe(80)
		expect(config.quotes).toBe('single')
	})

	it(
		'generated .oxfmtrc.json is accepted by oxfmt',
		async () => {
			const testDir = path.join(fixtures, 'vite-plus-no-lint')
			const profile = await detectProject(testDir)
			const diffs = await oxfmtTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === '.oxfmtrc.json')
			if (!configFile) throw new Error('Expected .oxfmtrc.json diff to exist')
			const config = configFile.after

			const { writeFile, mkdtemp, rm } = await import('node:fs/promises')
			const { join } = await import('node:path')
			const { tmpdir } = await import('node:os')
			const { execSync } = await import('node:child_process')

			const tmpDir = await mkdtemp(join(tmpdir(), 'oxfmt-validate-'))
			await writeFile(join(tmpDir, '.oxfmtrc.json'), config)
			await writeFile(join(tmpDir, 'test.ts'), 'const  x:number=1\n')

			execSync(
				`npx -y oxfmt@latest --config ${join(tmpDir, '.oxfmtrc.json')} ${join(tmpDir, 'test.ts')}`,
				{ cwd: tmpDir, stdio: 'pipe', timeout: toolTimeout },
			)

			const formatted = await import('node:fs/promises').then((m) =>
				m.readFile(join(tmpDir, 'test.ts'), 'utf-8'),
			)
			expect(formatted).toContain('const x: number = 1;')

			await rm(tmpDir, { recursive: true, force: true })
		},
		toolTimeout,
	)
})
