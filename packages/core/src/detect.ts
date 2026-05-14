// Main detection entry point - imports from modular files

import {
	fileExists,
	findConfigFile,
	readFile,
	resolvePath,
} from '@/utils/fs.js'
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

import { detectBundler } from './detect/bundler.js'

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

// ── Declarative file-existence detectors ──

interface FileDetectorSpec {
	key: keyof ProjectProfile['existing']
	basename: string
	extensions: string[]
}

const FILE_DETECTORS: FileDetectorSpec[] = [
	{ key: 'biome', basename: 'biome', extensions: ['.json', '.jsonc'] },
	{ key: 'oxlint', basename: '.oxlintrc', extensions: ['.json', '.jsonc'] },
	{ key: 'oxfmt', basename: '.oxfmtrc', extensions: ['.json', '.jsonc'] },
	{ key: 'tsconfig', basename: 'tsconfig', extensions: ['.json', '.jsonc'] },
	{ key: 'renovate', basename: 'renovate', extensions: ['.json', '.jsonc'] },
	{
		key: 'commitlint',
		basename: 'commitlint.config',
		extensions: ['.ts', '.js', '.mjs', '.mts', '.cts'],
	},
	{ key: 'knip', basename: 'knip', extensions: ['.ts', '.mts'] },
	{ key: 'plop', basename: 'plopfile', extensions: ['.ts', '.js', '.mjs'] },
	{ key: 'turbo', basename: 'turbo', extensions: ['.json'] },
	{
		key: 'vscodeSettings',
		basename: '.vscode/settings',
		extensions: ['.json'],
	},
	{
		key: 'viteConfig',
		basename: 'vite.config',
		extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
	},
	{ key: 'versionrc', basename: '.versionrc', extensions: [] },
	{ key: 'gitignore', basename: '.gitignore', extensions: [] },
]

// ── Custom detectors for complex cases ──

async function detectEslint(
	cwd: string,
	deps?: Record<string, string>,
): Promise<boolean> {
	const hasConfigFile = await findConfigFile(cwd, '.eslintrc', [
		'.js',
		'.cjs',
		'.json',
		'.yaml',
		'.yml',
	]).then(Boolean)
	if (hasConfigFile) return true

	const hasFlatConfig = await findConfigFile(cwd, 'eslint.config', [
		'.js',
		'.mjs',
		'.cjs',
		'.ts',
		'.mts',
		'.cts',
	]).then(Boolean)
	if (hasFlatConfig) return true

	if (deps) return !!deps.eslint
	const pkg = await readPackageJson(cwd)
	return !!(pkg?.devDependencies?.eslint ?? pkg?.dependencies?.eslint)
}

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

async function detectChangeset(
	cwd: string,
	deps?: Record<string, string>,
): Promise<boolean> {
	const hasConfig = await fileExists(
		resolvePath(cwd, '.changeset', 'config.json'),
	)
	if (hasConfig) return true
	if (deps) return !!deps['@changesets/cli']
	const pkg = await readPackageJson(cwd)
	return !!(
		pkg?.devDependencies?.['@changesets/cli'] ??
		pkg?.dependencies?.['@changesets/cli']
	)
}

async function detectAgentsMd(cwd: string): Promise<boolean> {
	const found = await findConfigFile(cwd, 'AGENTS', ['.md']).then(Boolean)
	if (found) return true
	return fileExists(resolvePath(cwd, 'CLAUDE.md'))
}

// ── Custom detectors ──

type CustomDetector = {
	key: keyof ProjectProfile['existing']
	detect: (
		cwd: string,
		deps?: Record<string, string>,
	) => Promise<boolean | string[]>
}

const CUSTOM_DETECTORS: CustomDetector[] = [
	{ key: 'eslint', detect: detectEslint },
	{ key: 'githubWorkflows', detect: detectGitHubWorkflows },
	{ key: 'changeset', detect: detectChangeset },
	{ key: 'agentsMd', detect: detectAgentsMd },
]

// ── Unified detection runner ──

async function detectFileConfig(
	cwd: string,
	spec: FileDetectorSpec,
): Promise<boolean> {
	if (spec.extensions.length === 0) {
		return fileExists(resolvePath(cwd, spec.basename))
	}
	return findConfigFile(cwd, spec.basename, spec.extensions).then(Boolean)
}

async function detectExistingConfigs(
	cwd: string,
	deps?: Record<string, string>,
): Promise<ProjectProfile['existing']> {
	const fileResults = await Promise.all(
		FILE_DETECTORS.map((d) => detectFileConfig(cwd, d)),
	)
	const customResults = await Promise.all(
		CUSTOM_DETECTORS.map((d) => d.detect(cwd, deps)),
	)
	const existing: Partial<ProjectProfile['existing']> = {}
	for (let i = 0; i < FILE_DETECTORS.length; i++) {
		;(existing as Record<string, unknown>)[FILE_DETECTORS[i].key] =
			fileResults[i]
	}
	for (let i = 0; i < CUSTOM_DETECTORS.length; i++) {
		;(existing as Record<string, unknown>)[CUSTOM_DETECTORS[i].key] =
			customResults[i]
	}
	return existing as ProjectProfile['existing']
}

async function detectNodeVersion(cwd: string): Promise<string> {
	const nvmrcPath = resolvePath(cwd, '.nvmrc')
	const nvmrcExists = await fileExists(nvmrcPath)
	if (nvmrcExists) {
		const content = await readFile(nvmrcPath)
		const match = content.trim().match(/^v?(\d+)/)
		if (match) return match[1]
	}

	const pkg = await readPackageJson(cwd)
	const enginesNode = pkg?.engines?.node
	if (enginesNode) {
		const match = String(enginesNode).match(/\d+/)
		if (match) return match[0]
	}

	return '20'
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

		const nodeVersion = await detectNodeVersion(cwd)

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
			nodeVersion,
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

	const [
		monorepoInfo,
		hasGitHub,
		hasGit,
		packageManager,
		existing,
		nodeVersion,
	] = await Promise.all([
		detectMonorepo(cwd),
		fileExists(resolvePath(cwd, '.github')),
		fileExists(resolvePath(cwd, '.git')),
		detectPackageManager(cwd),
		detectExistingConfigs(cwd, allDeps),
		detectNodeVersion(cwd),
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
		nodeVersion,
		hasGitHub,
		hasGit,
		existing,
	}
}
