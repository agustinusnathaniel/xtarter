import {
	fileExists,
	findConfigFile,
	readFile,
	resolvePath,
} from '@/utils/fs.js'
import { readPackageJson } from '@/utils/pkg.js'
import {
	computeFingerprint,
	isCacheValid,
	readProfileCache,
	writeProfileCache,
} from './detect/cache.js'
import type {
	Bundler,
	Framework,
	MonorepoDetection,
	PackageManager,
	ProjectProfile,
	Router,
	Styling,
} from './detect/types.js'

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
import { detectMonorepo } from './detect/monorepo.js'
import {
	detectFrameworkVersion,
	detectPackageManager,
} from './detect/package-manager.js'

export { detectPackageManager }

// ── Inline type guards (was detect/utils.ts) ──

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (!isRecord(value)) return false
	return Object.values(value).every((v): v is string => typeof v === 'string')
}

// ── Inline framework detection (was detect/framework.ts) ──

export function detectFramework(deps: Record<string, string>): Framework {
	const hasReactNative = !!(deps['react-native'] || deps.expo)
	const hasReact = !!deps.react
	const hasVue = !!deps.vue
	const hasSvelte = !!deps.svelte
	const hasSolid = !!deps['solid-js']

	if (hasReactNative) return 'react-native'
	if (hasReact) return 'react'
	if (hasVue) return 'vue'
	if (hasSvelte) return 'svelte'
	if (hasSolid) return 'solid'
	return 'node'
}

function detectRuntime(
	framework: Framework,
	bundler: Bundler,
): 'browser' | 'node' | 'edge' | 'native' | 'universal' {
	if (framework === 'react-native') return 'native'
	if (bundler === 'expo') return 'native'
	if (bundler === 'nextjs') return 'edge'
	if (bundler === 'tanstack-start') return 'edge'
	// Node framework takes precedence over bundler detection
	if (framework === 'node') return 'node'
	if (bundler === 'vite' || bundler === 'webpack' || bundler === 'rspack')
		return 'browser'
	return 'browser'
}

function detectVitePlus(deps: Record<string, string>): boolean {
	return 'vite-plus' in deps || 'vp' in deps
}

// ── Inline router detection (was detect/router.ts) ──

function detectRouter(deps: Record<string, string>, bundler: Bundler): Router {
	if (bundler === 'nextjs') return 'next'
	if (bundler === 'expo') return 'expo-router'
	if (deps['@tanstack/react-router']) return 'tanstack-router'
	if (deps['react-router'] || deps['react-router-dom']) return 'react-router'
	if (deps['vue-router']) return 'vue-router'
	return null
}

// ── Inline styling detection (was detect/styling.ts) ──

function detectStyling(deps: Record<string, string>): Styling[] {
	const result: Styling[] = []
	if (deps.tailwindcss || deps['@tailwindcss/vite']) result.push('tailwind')
	if (deps['styled-components']) result.push('styled-components')
	if (deps['@vanilla-extract/css']) result.push('vanilla-extract')
	if (deps.nativewind) result.push('nativewind')
	if (result.length === 0) result.push('vanilla')
	return result
}

// ── Declarative file-existence detectors ──

interface FileDetectorSpec {
	key: keyof ProjectProfile['existing']
	basename: string
	extensions: string[]
}

const FILE_DETECTORS: FileDetectorSpec[] = [
	{ key: 'biome', basename: 'biome', extensions: ['.json', '.jsonc'] },
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
	if (!(await fileExists(workflowsDir))) return []

	const { readdir } = await import('node:fs/promises')
	const entries = await readdir(workflowsDir)
	return entries
		.filter(
			(e): e is string =>
				typeof e === 'string' && (e.endsWith('.yml') || e.endsWith('.yaml')),
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

async function detectOxlint(cwd: string): Promise<boolean> {
	const oldFormat = await findConfigFile(cwd, '.oxlintrc', [
		'.json',
		'.jsonc',
	]).then(Boolean)
	if (oldFormat) return true

	return findConfigFile(cwd, 'oxlint.config', ['.ts', '.js', '.mjs']).then(
		Boolean,
	)
}

async function detectOxfmt(cwd: string): Promise<boolean> {
	const oldFormat = await findConfigFile(cwd, '.oxfmtrc', [
		'.json',
		'.jsonc',
	]).then(Boolean)
	if (oldFormat) return true

	return findConfigFile(cwd, 'oxfmt.config', ['.ts', '.js', '.mjs']).then(
		Boolean,
	)
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
	{ key: 'oxlint', detect: detectOxlint },
	{ key: 'oxfmt', detect: detectOxfmt },
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

// ── Shared base profile fields ──

async function computeBaseProfile(cwd: string): Promise<{
	monorepo: boolean
	monorepoTool: 'turbo' | 'nx' | 'lerna' | null
	workspaceRoot: boolean
	nodeVersion: string
	hasGitHub: boolean
	hasGit: boolean
	existing: ProjectProfile['existing']
	packageManager: PackageManager
}> {
	const [monorepoInfo, hasGitHub, hasGit, packageManager, nodeVersion] =
		await Promise.all([
			detectMonorepo(cwd),
			fileExists(resolvePath(cwd, '.github')),
			fileExists(resolvePath(cwd, '.git')),
			detectPackageManager(cwd),
			detectNodeVersion(cwd),
		])

	const existing = await detectExistingConfigs(cwd)

	return {
		monorepo: monorepoInfo.monorepo,
		monorepoTool: monorepoInfo.monorepoTool,
		workspaceRoot: monorepoInfo.workspaceRoot,
		nodeVersion,
		hasGitHub,
		hasGit,
		existing,
		packageManager,
	}
}

// ── Internal detection logic (no caching) ──

async function computeProjectProfile(cwd: string): Promise<ProjectProfile> {
	const base = await computeBaseProfile(cwd)
	const pkg = await readPackageJson(cwd)

	if (!pkg) {
		return {
			framework: null,
			frameworkVersion: null,
			bundler: null,
			router: null,
			styling: ['vanilla'],
			typescript: base.existing.tsconfig,
			runtime: 'node',
			vitePlus: false,
			...base,
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
	const typescript =
		'typescript' in allDeps ||
		(await fileExists(resolvePath(cwd, 'tsconfig.json')))

	return {
		framework,
		frameworkVersion: detectFrameworkVersion(pkg, framework),
		bundler,
		router: detectRouter(allDeps, bundler),
		styling: detectStyling(allDeps),
		typescript,
		runtime: detectRuntime(framework, bundler),
		vitePlus: detectVitePlus(allDeps),
		...base,
	}
}

// ── Cached detection entry point ──

export async function detectProject(cwd: string): Promise<ProjectProfile> {
	const fingerprint = await computeFingerprint(cwd)
	const cached = await readProfileCache(cwd)
	if (cached && isCacheValid(cached, fingerprint)) {
		return cached.profile
	}

	const start = performance.now()
	const profile = await computeProjectProfile(cwd)
	const durationMs = performance.now() - start

	await writeProfileCache(cwd, {
		version: 1,
		fingerprint,
		profile,
		computedAt: new Date().toISOString(),
		durationMs,
	})

	return profile
}
