import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('detectProject', () => {
	it('detects react-vite-tailwind correctly', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(profile.framework).toBe('react')
		expect(profile.frameworkVersion).toBe('18.2.0')
		expect(profile.bundler).toBe('vite')
		expect(profile.router).toBeNull()
		expect(profile.styling).toContain('tailwind')
		expect(profile.runtime).toBe('browser')
		expect(profile.packageManager).toBe('pnpm')
		expect(profile.typescript).toBe(true)
		expect(profile.vitePlus).toBe(false)
		expect(profile.monorepo).toBe(false)
		expect(profile.monorepoTool).toBeNull()
		expect(profile.workspaceRoot).toBe(false)
		expect(profile.hasGitHub).toBe(false)
		expect(profile.hasGit).toBe(false)
		expect(profile.nodeVersion).toBe('18')
		expect(profile.existing.tsconfig).toBe(true)
		expect(profile.existing.viteConfig).toBe(true)
		expect(profile.existing.biome).toBe(false)
		expect(profile.existing.gitignore).toBe(false)
	})

	it('detects react-vite-no-styling correctly', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-no-styling'),
		)
		expect(profile.framework).toBe('react')
		expect(profile.bundler).toBe('vite')
		expect(profile.router).toBeNull()
		expect(profile.styling).toContain('vanilla')
		expect(profile.runtime).toBe('browser')
		expect(profile.packageManager).toBe('npm')
		expect(profile.typescript).toBe(true)
		expect(profile.vitePlus).toBe(false)
		expect(profile.hasGit).toBe(false)
		expect(profile.hasGitHub).toBe(false)
	})

	it('detects vue-vite correctly', async () => {
		const profile = await detectProject(path.join(fixtures, 'vue-vite'))
		expect(profile.framework).toBe('vue')
		expect(profile.frameworkVersion).toBe('3.4.0')
		expect(profile.bundler).toBe('vite')
		expect(profile.router).toBeNull()
		expect(profile.runtime).toBe('browser')
		expect(profile.packageManager).toBe('pnpm')
		expect(profile.typescript).toBe(true)
		expect(profile.vitePlus).toBe(false)
		expect(profile.hasGit).toBe(false)
	})

	it('detects nextjs correctly', async () => {
		const profile = await detectProject(path.join(fixtures, 'nextjs'))
		expect(profile.framework).toBe('react')
		expect(profile.frameworkVersion).toBe('18.2.0')
		expect(profile.bundler).toBe('nextjs')
		expect(profile.router).toBe('next')
		expect(profile.runtime).toBe('edge')
		expect(profile.packageManager).toBe('pnpm')
		expect(profile.typescript).toBe(true)
		expect(profile.vitePlus).toBe(false)
		expect(profile.hasGit).toBe(false)
	})

	it('detects react-native-expo correctly', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-native-expo'),
		)
		// Framework is null because both react and react-native are present (ambiguous)
		// CLI layer should prompt for clarification
		expect(profile.framework).toBe(null)
		expect(profile.bundler).toBe('expo')
		expect(profile.router).toBe('expo-router')
		// runtime is native because bundler is expo (React Native)
		expect(profile.runtime).toBe('native')
		expect(profile.packageManager).toBe('yarn')
		expect(profile.styling).toContain('vanilla')
		expect(profile.typescript).toBe(true)
		expect(profile.vitePlus).toBe(false)
		expect(profile.hasGit).toBe(false)
	})

	it('detects node-only correctly', async () => {
		const profile = await detectProject(path.join(fixtures, 'node-only'))
		expect(profile.framework).toBe('node')
		expect(profile.frameworkVersion).toBeNull()
		expect(profile.bundler).toBe('none')
		expect(profile.router).toBeNull()
		expect(profile.runtime).toBe('node')
		expect(profile.packageManager).toBe('pnpm')
		expect(profile.typescript).toBe(true)
		expect(profile.vitePlus).toBe(false)
		expect(profile.hasGit).toBe(false)
	})

	it('detects monorepo-turbo correctly', async () => {
		const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'))
		expect(profile.monorepo).toBe(true)
		expect(profile.monorepoTool).toBe('turbo')
		expect(profile.workspaceRoot).toBe(true)
		expect(profile.framework).toBe('node')
		expect(profile.bundler).toBe('none')
		expect(profile.runtime).toBe('node')
		expect(profile.packageManager).toBe('pnpm')
		expect(profile.typescript).toBe(false)
		expect(profile.vitePlus).toBe(false)
		expect(profile.hasGit).toBe(false)
	})

	it('detects monorepo when running inside workspace package', async () => {
		const root = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-workspace-'),
		)
		await fs.mkdir(path.join(root, '.git'), { recursive: true })
		await fs.writeFile(
			path.join(root, 'pnpm-workspace.yaml'),
			'packages:\n  - apps/*\n',
		)
		await fs.writeFile(
			path.join(root, 'package.json'),
			JSON.stringify({ name: 'workspace-root', version: '1.0.0' }),
		)

		const appDir = path.join(root, 'apps', 'web')
		await fs.mkdir(appDir, { recursive: true })
		await fs.writeFile(
			path.join(appDir, 'package.json'),
			JSON.stringify({ name: 'web-app', version: '1.0.0' }),
		)

		const profile = await detectProject(appDir)
		expect(profile.monorepo).toBe(true)
		expect(profile.workspaceRoot).toBe(false)
		expect(profile.monorepoTool).toBeNull()

		await fs.rm(root, { recursive: true, force: true })
	})

	it('detects bundlers from config files when dependencies are absent', async () => {
		const cases = [
			['vite.config.mjs', 'vite'],
			['next.config.mjs', 'nextjs'],
			['webpack.config.cjs', 'webpack'],
			['rspack.config.ts', 'rspack'],
		] as const

		for (const [configFile, expectedBundler] of cases) {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), `xtarterize-${expectedBundler}-`),
			)
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ dependencies: {} }),
			)
			await fs.writeFile(path.join(tmpDir, configFile), 'export default {}\n')

			const profile = await detectProject(tmpDir)
			expect(profile.bundler).toBe(expectedBundler)
		}
	})

	it('keeps dependency bundler detection ahead of config files', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-deps-'))
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ dependencies: { vite: '^5.0.0' } }),
		)
		await fs.writeFile(
			path.join(tmpDir, 'next.config.js'),
			'export default {}\n',
		)

		const profile = await detectProject(tmpDir)
		expect(profile.bundler).toBe('vite')
	})

	it('nodeVersion defaults to 20 when no config present', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-nodever-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg' }),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.nodeVersion).toBe('20')
	})

	it('nodeVersion reads from .nvmrc', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-nvmrc-'))
		await fs.writeFile(path.join(tmpDir, '.nvmrc'), '22\n')
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg' }),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.nodeVersion).toBe('22')
	})

	it('nodeVersion reads from .nvmrc stripping leading v', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-nvmrc-v-'),
		)
		await fs.writeFile(path.join(tmpDir, '.nvmrc'), 'v18\n')
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ name: 'test-pkg' }),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.nodeVersion).toBe('18')
	})

	it('nodeVersion falls back to engines.node from package.json', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-engines-'),
		)
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'test-pkg',
				engines: { node: '>=22' },
			}),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.nodeVersion).toBe('22')
	})

	it('nodeVersion prefers .nvmrc over engines.node', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-prefer-nvmrc-'),
		)
		await fs.writeFile(path.join(tmpDir, '.nvmrc'), '20\n')
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({
				name: 'test-pkg',
				engines: { node: '22' },
			}),
		)

		const profile = await detectProject(tmpDir)
		expect(profile.nodeVersion).toBe('20')
	})
})
