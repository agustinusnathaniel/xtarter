// Main detection entry point - imports from modular files

import { fileExists, findConfigFile, resolvePath } from '@/utils/fs.js'
import { readPackageJson } from '@/utils/pkg.js'

// Import types
import type {
	Bundler,
	Framework,
	MonorepoDetection,
	PackageManager,
	ProjectProfile,
	Router,
	Styling,
} from './detect/types.js'

// Re-export types
export type {
	Bundler,
	Framework,
	MonorepoDetection,
	PackageManager,
	ProjectProfile,
	Router,
	Styling,
}

import { detectBundler, hasBundlerConfig } from './detect/bundler.js'

// Detection functions
import {
	detectFramework,
	detectRuntime,
	detectVitePlus,
} from './detect/framework.js'
import { detectMonorepo } from './detect/monorepo.js'
import {
	detectFrameworkVersion,
	detectPackageManager,
} from './detect/package-manager.js'
import { detectRouter } from './detect/router.js'
import { detectStyling } from './detect/styling.js'
// Utilities
import { isStringRecord } from './detect/utils.js'

export { detectFramework, detectPackageManager }

async function detectGitHubWorkflows(cwd: string): Promise<string[]> {
	const workflowsDir = resolvePath(cwd, '.github', 'workflows')
	const exists = await fileExists(workflowsDir)
	if (!exists) return []

	const { readdir } = await import('node:fs/promises')
	const entries = await readdir(workflowsDir)
	return entries
		.filter(
			(e): e is string =>
				(typeof e === 'string' && e.endsWith('.yml')) || e.endsWith('.yaml'),
		)
		.map((e) => e.replace(/\.(yml|yaml)$/, ''))
}

async function detectExistingConfigs(
	cwd: string,
): Promise<ProjectProfile['existing']> {
	const [
		biome,
		tsconfig,
		renovate,
		commitlint,
		knip,
		plop,
		turbo,
		vscodeSettings,
		agentsMd,
		githubWorkflows,
		viteConfig,
		versionrc,
		gitignore,
	] = await Promise.all([
		findConfigFile(cwd, 'biome', ['.json', '.jsonc']).then(Boolean),
		findConfigFile(cwd, 'tsconfig', ['.json', '.jsonc']).then(Boolean),
		findConfigFile(cwd, 'renovate', ['.json', '.jsonc']).then(Boolean),
		findConfigFile(cwd, 'commitlint.config', [
			'.ts',
			'.js',
			'.mjs',
			'.mts',
			'.cts',
		]).then(Boolean),
		findConfigFile(cwd, 'knip', ['.ts', '.mts']).then(Boolean),
		findConfigFile(cwd, 'plopfile', ['.ts', '.js', '.mjs']).then(Boolean),
		fileExists(resolvePath(cwd, 'turbo.json')),
		fileExists(resolvePath(cwd, '.vscode', 'settings.json')),
		findConfigFile(cwd, 'AGENTS', ['.md'])
			.then(Boolean)
			.then((v) => v || fileExists(resolvePath(cwd, 'CLAUDE.md'))),
		detectGitHubWorkflows(cwd),
		hasBundlerConfig(cwd, 'vite.config', [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		]),
		fileExists(resolvePath(cwd, '.versionrc')),
		fileExists(resolvePath(cwd, '.gitignore')),
	])

	return {
		biome,
		tsconfig,
		renovate,
		commitlint,
		knip,
		plop,
		turbo,
		vscodeSettings,
		agentsMd,
		githubWorkflows,
		viteConfig,
		versionrc,
		gitignore,
	}
}

export async function detectProject(cwd: string): Promise<ProjectProfile> {
	const pkg = await readPackageJson(cwd)

	if (!pkg) {
		const monorepoInfo = await detectMonorepo(cwd)
		const [hasGitHub, hasGit] = await Promise.all([
			fileExists(resolvePath(cwd, '.github')),
			fileExists(resolvePath(cwd, '.git')),
		])
		const existing = await detectExistingConfigs(cwd)
		const packageManager = await detectPackageManager(cwd)

		return {
			framework: null,
			frameworkVersion: null,
			bundler: null,
			router: null,
			styling: ['vanilla'],
			typescript: existing.tsconfig,
			runtime: 'node',
			packageManager,
			vitePlus: false,
			monorepo: monorepoInfo.monorepo,
			monorepoTool: monorepoInfo.monorepoTool,
			workspaceRoot: monorepoInfo.workspaceRoot,
			hasGitHub,
			hasGit,
			existing,
		}
	}

	const allDeps: Record<string, string> = {}
	if (isStringRecord(pkg.dependencies)) {
		Object.assign(allDeps, pkg.dependencies)
	}
	if (isStringRecord(pkg.devDependencies)) {
		Object.assign(allDeps, pkg.devDependencies)
	}

	const framework = detectFramework(allDeps)
	const bundler = await detectBundler(allDeps, cwd)
	const router = detectRouter(allDeps, bundler)
	const styling = detectStyling(allDeps)
	const runtime = detectRuntime(framework, bundler)
	const vitePlus = detectVitePlus(allDeps)
	const typescript =
		'typescript' in allDeps ||
		(await fileExists(resolvePath(cwd, 'tsconfig.json')))

	const [monorepoInfo, hasGitHub, hasGit, packageManager, existing] =
		await Promise.all([
			detectMonorepo(cwd),
			fileExists(resolvePath(cwd, '.github')),
			fileExists(resolvePath(cwd, '.git')),
			detectPackageManager(cwd),
			detectExistingConfigs(cwd),
		])

	return {
		framework,
		frameworkVersion: detectFrameworkVersion(pkg as unknown, framework),
		bundler,
		router,
		styling,
		typescript,
		runtime,
		vitePlus,
		packageManager,
		monorepo: monorepoInfo.monorepo,
		monorepoTool: monorepoInfo.monorepoTool,
		workspaceRoot: monorepoInfo.workspaceRoot,
		hasGitHub,
		hasGit,
		existing,
	}
}
