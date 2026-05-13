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

		expect(configFile).toBeDefined()
		expect(configFile?.before).toBeNull()

		const config = JSON.parse(configFile!.after!)
		expect(config.rules['no-console']).toBe('error')
		expect(config.rules.complexity).toBe('warn')
		expect(config.rules['no-unused-vars']).toBe('off')
		expect(
			Array.isArray(config.rules['@typescript-eslint/no-unused-vars']),
		).toBe(true)
		expect(
			Array.isArray(config.rules['@typescript-eslint/consistent-type-imports']),
		).toBe(true)
	})

	it(
		'generated .oxlintrc.json is accepted by oxlint',
		async () => {
			const testDir = path.join(fixtures, 'vite-plus-no-lint')
			const profile = await detectProject(testDir)
			const diffs = await oxlintTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === '.oxlintrc.json')
			const config = configFile!.after!

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

		expect(configFile).toBeDefined()
		const config = JSON.parse(configFile!.after!)
		expect(config.rules['jsx-a11y/anchor-is-valid']).toBeDefined()
	})
})

describe('oxfmt config validation', () => {
	it('generated .oxfmtrc.json is valid JSON with expected options', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		const diffs = await oxfmtTask.dryRun(testDir, profile)
		const configFile = diffs.find((d) => d.filepath === '.oxfmtrc.json')

		expect(configFile).toBeDefined()
		expect(configFile?.before).toBeNull()

		const config = JSON.parse(configFile!.after!)
		expect(config.indentStyle).toBe('space')
		expect(config.indentWidth).toBe(2)
		expect(config.lineWidth).toBe(80)
		expect(config.quotes).toBe('single')
		expect(config.semicolons).toBe(true)
		expect(config.trailingComma).toBe('all')
	})

	it(
		'generated .oxfmtrc.json is accepted by oxfmt',
		async () => {
			const testDir = path.join(fixtures, 'vite-plus-no-lint')
			const profile = await detectProject(testDir)
			const diffs = await oxfmtTask.dryRun(testDir, profile)
			const configFile = diffs.find((d) => d.filepath === '.oxfmtrc.json')
			const config = configFile!.after!

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
