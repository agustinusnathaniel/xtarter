import { detectPackageManager as detectPM } from 'nypm'
import { dirname, relative } from 'pathe'
import { fileExists, findConfigFile, resolvePath } from '@/utils/fs.js'
import { readPackageJson } from '@/utils/pkg.js'

export type Framework =
	| 'react'
	| 'react-native'
	| 'vue'
	| 'svelte'
	| 'solid'
	| 'node'
	| null
export type Bundler =
	| 'vite'
	| 'nextjs'
	| 'tanstack-start'
	| 'expo'
	| 'webpack'
	| 'rspack'
	| 'none'
	| null
export type Router =
	| 'tanstack-router'
	| 'react-router'
	| 'next'
	| 'expo-router'
	| 'vue-router'
	| null
export type Styling =
	| 'tailwind'
	| 'css-modules'
	| 'styled-components'
	| 'vanilla-extract'
	| 'nativewind'
	| 'vanilla'
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export interface ProjectProfile {
	framework: Framework
	frameworkVersion: string | null
	bundler: Bundler
	router: Router
	styling: Styling[]
	typescript: boolean
	runtime: 'browser' | 'node' | 'edge' | 'native' | 'universal'
	packageManager: PackageManager
	vitePlus: boolean
	monorepo: boolean
	monorepoTool: 'turbo' | 'nx' | 'lerna' | null
	workspaceRoot: boolean
	hasGitHub: boolean
	hasGit: boolean
	existing: {
		biome: boolean
		tsconfig: boolean
		renovate: boolean
		commitlint: boolean
		knip: boolean
		plop: boolean
		turbo: boolean
		vscodeSettings: boolean
		agentsMd: boolean
		githubWorkflows: string[]
		viteConfig: boolean
		versionrc: boolean
		gitignore: boolean
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (!isRecord(value)) return false
	return Object.values(value).every((v): v is string => typeof v === 'string')
}

export function detectFramework(deps: Record<string, string>): Framework {
	const hasReactNative = !!(deps['react-native'] || deps.expo)
	const hasReact = !!deps.react
	const hasVue = !!deps.vue
	const hasSvelte = !!deps.svelte
	const hasSolid = !!deps['solid-js']

	if (hasReactNative && hasReact) {
		return null // ambiguous, will be resolved by prompt
	}
	if (hasReactNative) return 'react-native'
	if (hasReact) return 'react'
	if (hasVue) return 'vue'
	if (hasSvelte) return 'svelte'
	if (hasSolid) return 'solid'
	return 'node'
}

function detectFrameworkVersion(
	pkg: unknown,
	framework: Framework,
): string | null {
	if (!isRecord(pkg)) return null
	const allDeps: Record<string, string> = {}
	if (isStringRecord(pkg.dependencies)) {
		Object.assign(allDeps, pkg.dependencies)
	}
	if (isStringRecord(pkg.devDependencies)) {
		Object.assign(allDeps, pkg.devDependencies)
	}

	const frameworkPkg =
		framework === 'react-native'
			? (allDeps['react-native'] ?? allDeps.expo)
			: framework === 'node'
				? null
				: framework
					? allDeps[framework === 'solid' ? 'solid-js' : framework]
					: null

	if (!frameworkPkg) return null

	const cleaned = frameworkPkg.replace(/^[^0-9]*/, '')
	return cleaned || null
}

async function hasBundlerConfig(
	cwd: string,
	baseName: string,
): Promise<boolean> {
	return Boolean(
		await findConfigFile(cwd, baseName, [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		]),
	)
}

async function detectBundler(
	deps: Record<string, string>,
	cwd: string,
): Promise<Bundler> {
	if (deps['@tanstack/start']) return 'tanstack-start'
	if (deps.next) return 'nextjs'
	if (deps.expo) return 'expo'
	if (deps.vite) return 'vite'
	if (deps.webpack) return 'webpack'
	if (deps['@rspack/core']) return 'rspack'
	if (await hasBundlerConfig(cwd, 'next.config')) return 'nextjs'
	if (await hasBundlerConfig(cwd, 'vite.config')) return 'vite'
	if (
		(await hasBundlerConfig(cwd, 'webpack.config')) ||
		(await hasBundlerConfig(cwd, 'rspack.config'))
	) {
		return (await hasBundlerConfig(cwd, 'rspack.config')) ? 'rspack' : 'webpack'
	}
	return 'none'
}

function detectRouter(deps: Record<string, string>, bundler: Bundler): Router {
	if (bundler === 'nextjs') return 'next'
	if (bundler === 'expo') return 'expo-router'
	if (deps['@tanstack/react-router']) return 'tanstack-router'
	if (deps['react-router'] || deps['react-router-dom']) return 'react-router'
	if (deps['vue-router']) return 'vue-router'
	return null
}

function detectStyling(deps: Record<string, string>): Styling[] {
	const result: Styling[] = []
	if (deps.tailwindcss || deps['@tailwindcss/vite']) result.push('tailwind')
	if (deps['styled-components']) result.push('styled-components')
	if (deps['@vanilla-extract/css']) result.push('vanilla-extract')
	if (deps.nativewind) result.push('nativewind')
	if (result.length === 0) result.push('vanilla')
	return result
}

function detectRuntime(
	framework: Framework,
	bundler: Bundler,
): 'browser' | 'node' | 'edge' | 'native' | 'universal' {
	if (framework === 'react-native') return 'native'
	if (bundler === 'expo') return 'native'
	if (bundler === 'nextjs') return 'edge'
	if (bundler === 'tanstack-start') return 'edge'
	if (bundler === 'vite' || bundler === 'webpack' || bundler === 'rspack')
		return 'browser'
	if (framework === 'node') return 'node'
	return 'browser'
}

function detectVitePlus(deps: Record<string, string>): boolean {
	return 'vite-plus' in deps || 'vp' in deps
}

export async function detectPackageManager(
	cwd: string,
): Promise<PackageManager> {
	const detected = await detectPM(cwd)
	if (
		detected?.name === 'npm' ||
		detected?.name === 'pnpm' ||
		detected?.name === 'yarn' ||
		detected?.name === 'bun'
	) {
		return detected.name
	}

	// Fallback to lockfile detection if nypm fails
	if (await fileExists(resolvePath(cwd, 'bun.lockb'))) return 'bun'
	if (await fileExists(resolvePath(cwd, 'bun.lock'))) return 'bun'
	if (await fileExists(resolvePath(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
	if (await fileExists(resolvePath(cwd, 'yarn.lock'))) return 'yarn'
	if (await fileExists(resolvePath(cwd, 'package-lock.json'))) return 'npm'

	return 'npm'
}

async function detectMonorepo(cwd: string): Promise<{
	monorepo: boolean
	monorepoTool: 'turbo' | 'nx' | 'lerna' | null
	workspaceRoot: boolean
}> {
	const markers = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json']
	const packageDirs = ['apps/', 'packages/', 'services/']

	const hasMonorepoMarkers = async (dir: string): Promise<boolean> => {
		for (const marker of markers) {
			if (await fileExists(resolvePath(dir, marker))) return true
		}
		const hasPackagesDir = await fileExists(resolvePath(dir, 'packages'))
		const hasAppsDir = await fileExists(resolvePath(dir, 'apps'))
		return hasPackagesDir && hasAppsDir
	}

	const hasPnpmWorkspace = await fileExists(
		resolvePath(cwd, 'pnpm-workspace.yaml'),
	)
	const hasTurboJson = await fileExists(resolvePath(cwd, 'turbo.json'))
	const hasNxJson = await fileExists(resolvePath(cwd, 'nx.json'))
	const hasLernaJson = await fileExists(resolvePath(cwd, 'lerna.json'))
	const hasPackagesDir = await fileExists(resolvePath(cwd, 'packages'))
	const hasAppsDir = await fileExists(resolvePath(cwd, 'apps'))

	const monorepo =
		hasPnpmWorkspace ||
		hasTurboJson ||
		hasNxJson ||
		hasLernaJson ||
		(hasPackagesDir && hasAppsDir)

	let monorepoTool: 'turbo' | 'nx' | 'lerna' | null = null
	if (hasTurboJson) monorepoTool = 'turbo'
	else if (hasNxJson) monorepoTool = 'nx'
	else if (hasLernaJson) monorepoTool = 'lerna'

	if (!monorepo) {
		let current = dirname(cwd)
		while (current !== dirname(current)) {
			if (await hasMonorepoMarkers(current)) {
				const rel = relative(current, cwd)
				const inWorkspacePackage = packageDirs.some((prefix) =>
					rel.startsWith(prefix),
				)
				if (inWorkspacePackage) {
					return {
						monorepo: true,
						monorepoTool: (await fileExists(resolvePath(current, 'turbo.json')))
							? 'turbo'
							: (await fileExists(resolvePath(current, 'nx.json')))
								? 'nx'
								: (await fileExists(resolvePath(current, 'lerna.json')))
									? 'lerna'
									: null,
						workspaceRoot: false,
					}
				}
			}

			if (await fileExists(resolvePath(current, '.git'))) break
			current = dirname(current)
		}
	}

	return { monorepo, monorepoTool, workspaceRoot: monorepo }
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
		findConfigFile(cwd, 'renovate', ['.json', '.json5']).then(Boolean),
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
		hasBundlerConfig(cwd, 'vite.config'),
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
