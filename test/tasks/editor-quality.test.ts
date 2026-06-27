import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	agentsMdTask,
	knipTask,
	turboTask,
	vscodeTask,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('knipTask', () => {
	it('is applicable to all projects (JSON format if no TS)', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(knipTask.applicable(tsProfile)).toBe(true)

		const nonTsProfile = await detectProject(
			path.join(fixtures, 'monorepo-turbo'),
		)
		expect(knipTask.applicable(nonTsProfile)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await knipTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})
})

describe('vscodeTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(vscodeTask.applicable(profile)).toBe(true)
	})

	it('dryRun returns settings and extensions diffs', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await vscodeTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBe(2)
		expect(diffs.some((d) => d.filepath.includes('settings.json'))).toBe(true)
		expect(diffs.some((d) => d.filepath.includes('extensions.json'))).toBe(true)
	})

	it('includes practical framework and styling settings', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await vscodeTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const settings = JSON.parse(
			diffs.find((d) => d.filepath.includes('settings.json'))?.after ?? '{}',
		)
		const extensions = JSON.parse(
			diffs.find((d) => d.filepath.includes('extensions.json'))?.after ?? '{}',
		)

		expect(settings['typescript.updateImportsOnFileMove.enabled']).toBe(
			'always',
		)
		expect(settings['tailwindCSS.experimental.classRegex']).toBeDefined()
		expect(extensions.recommendations).toContain('bradlc.vscode-tailwindcss')
	})

	it('additively merges extensions into existing list', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-vsc-ext-'),
		)
		await fs.mkdir(path.join(tmpDir, '.vscode'))
		await fs.writeFile(
			path.join(tmpDir, '.vscode', 'extensions.json'),
			JSON.stringify({
				recommendations: ['my-custom-extension', 'biomejs.biome'],
			}),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'vsc-test',
				devDependencies: {
					typescript: '^5.3.0',
					'@biomejs/biome': '^1.0.0',
				},
			}),
		)

		const profile = await detectProject(tmpDir)
		const diffs = await vscodeTask.dryRun(tmpDir, profile)
		const extDiff = diffs.find((d) => d.filepath.includes('extensions.json'))
		const result = JSON.parse(extDiff?.after ?? '{}')

		expect(result.recommendations).toContain('my-custom-extension')
		expect(result.recommendations).toContain('biomejs.biome')
		expect(result.recommendations).toContain('ms-vscode.vscode-typescript-next')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips when settings and extensions already match', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-vsc-skip-'),
		)
		await fs.mkdir(path.join(tmpDir, '.vscode'))

		const profile = await detectProject(tmpDir)
		const settingsDiffs = await vscodeTask.dryRun(tmpDir, profile)
		const settingsAfter = JSON.parse(
			settingsDiffs.find((d) => d.filepath.includes('settings.json'))?.after ??
				'{}',
		)
		const extAfter = JSON.parse(
			settingsDiffs.find((d) => d.filepath.includes('extensions.json'))
				?.after ?? '{}',
		)

		await fs.writeFile(
			path.join(tmpDir, '.vscode', 'settings.json'),
			JSON.stringify(settingsAfter),
		)
		await fs.writeFile(
			path.join(tmpDir, '.vscode', 'extensions.json'),
			JSON.stringify(extAfter),
		)

		const status = await vscodeTask.check(tmpDir, profile)
		expect(status).toBe('skip')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('apply writes the expected file', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-vsc-apply-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'apply-test',
				devDependencies: { typescript: '^5.3.0' },
			}),
		)
		const profile = await detectProject(tmpDir)
		await vscodeTask.apply(tmpDir, profile)
		const settingsPath = path.join(tmpDir, '.vscode', 'settings.json')
		const exists = await fs
			.access(settingsPath)
			.then(() => true)
			.catch(() => false)
		expect(exists).toBe(true)
		await fs.rm(tmpDir, { recursive: true, force: true })
	})
})

describe('agentsMdTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(agentsMdTask.applicable(profile)).toBe(true)
	})

	it('returns new when AGENTS.md is missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await agentsMdTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('renders minimal root with commands', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const [diff] = await agentsMdTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)

		expect(diff.after).toContain('## Commands')
		expect(diff.after).toContain('pnpm install')
		expect(diff.after).not.toContain('## Framework Guidance')
	})
})

describe('turboTask', () => {
	it('is applicable to monorepos only', async () => {
		const monoProfile = await detectProject(
			path.join(fixtures, 'monorepo-turbo'),
		)
		expect(turboTask.applicable(monoProfile)).toBe(true)

		const nonMonoProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(turboTask.applicable(nonMonoProfile)).toBe(false)
	})
})
