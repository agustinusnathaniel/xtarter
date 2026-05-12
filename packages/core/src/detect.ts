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

// ConfigDetector: each detector maps to a key in ProjectProfile['existing']
type ConfigDetector = {
	key: keyof ProjectProfile['existing']
	detect: (cwd: string) => Promise<boolean | string[]>
}

// Individual detector functions (defined before the array for hoisting)

async function detectBiome(cwd: string): Promise<boolean> {
	return findConfigFile(cwd, 'biome', ['.json', '.jsonc']).then(Boolean)
}

async function detectTsconfig(cwd: string): Promise<boolean> {
	return findConfigFile(cwd, 'tsconfig', ['.json', '.jsonc']).then(Boolean)
}

async function detectRenovate(cwd: string): Promise<boolean> {
	return findConfigFile(cwd, 'renovate', ['.json', '.jsonc']).then(Boolean)
}

async function detectCommitlint(cwd: string): Promise<boolean> {
	return findConfigFile(cwd, 'commitlint.config', [
		'.ts',
		'.js',
		'.mjs',
		'.mts',
		'.cts',
	]).then(Boolean)
}

async function detectKnip(cwd: string): Promise<boolean> {
	return findConfigFile(cwd, 'knip', ['.ts', '.mts']).then(Boolean)
}

async function detectPlop(cwd: string): Promise<boolean> {
	return findConfigFile(cwd, 'plopfile', ['.ts', '.js', '.mjs']).then(Boolean)
}

async function detectTurbo(cwd: string): Promise<boolean> {
	return fileExists(resolvePath(cwd, 'turbo.json'))
}

async function detectVscodeSettings(cwd: string): Promise<boolean> {
	return fileExists(resolvePath(cwd, '.vscode', 'settings.json'))
}

async function detectAgentsMd(cwd: string): Promise<boolean> {
	const found = await findConfigFile(cwd, 'AGENTS', ['.md']).then(Boolean)
	if (found) return true
	return fileExists(resolvePath(cwd, 'CLAUDE.md'))
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

async function detectViteConfig(cwd: string): Promise<boolean> {
	return hasBundlerConfig(cwd, 'vite.config', [
		'.ts',
		'.js',
		'.mts',
		'.mjs',
		'.cts',
		'.cjs',
	])
}

async function detectVersionrc(cwd: string): Promise<boolean> {
	return fileExists(resolvePath(cwd, '.versionrc'))
}

async function detectGitignore(cwd: string): Promise<boolean> {
	return fileExists(resolvePath(cwd, '.gitignore'))
}

async function detectChangeset(cwd: string): Promise<boolean> {
	const hasConfig = await fileExists(
		resolvePath(cwd, '.changeset', 'config.json'),
	)
	if (hasConfig) return true
	const pkg = await readPackageJson(cwd)
	return !!(
		pkg?.devDependencies?.['@changesets/cli'] ??
		pkg?.dependencies?.['@changesets/cli']
	)
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

// ConfigDetector array - order matters for the result object
const CONFIG_DETECTORS: ConfigDetector[] = [
	{ key: 'biome', detect: detectBiome },
	{ key: 'tsconfig', detect: detectTsconfig },
	{ key: 'renovate', detect: detectRenovate },
	{ key: 'commitlint', detect: detectCommitlint },
	{ key: 'knip', detect: detectKnip },
	{ key: 'plop', detect: detectPlop },
	{ key: 'turbo', detect: detectTurbo },
	{ key: 'vscodeSettings', detect: detectVscodeSettings },
	{ key: 'agentsMd', detect: detectAgentsMd },
	{ key: 'githubWorkflows', detect: detectGitHubWorkflows },
	{ key: 'viteConfig', detect: detectViteConfig },
	{ key: 'versionrc', detect: detectVersionrc },
	{ key: 'gitignore', detect: detectGitignore },
	{ key: 'changeset', detect: detectChangeset },
]

async function detectExistingConfigs(
	cwd: string,
): Promise<ProjectProfile['existing']> {
	const results = await Promise.all(CONFIG_DETECTORS.map((d) => d.detect(cwd)))

	const existing: Partial<ProjectProfile['existing']> = {}
	for (let i = 0; i < CONFIG_DETECTORS.length; i++) {
		;(existing as Record<string, unknown>)[CONFIG_DETECTORS[i].key] = results[i]
	}

	return existing as ProjectProfile['existing']
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
		detectExistingConfigs(cwd),
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
