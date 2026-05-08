import { dirname, relative } from 'pathe'
import { fileExists, resolvePath } from '@/utils/fs.js'
import type { MonorepoDetection } from './types.js'

/**
 * Detects monorepo structure and tooling
 * @param cwd - Current working directory
 * @returns Monorepo detection information
 */
export async function detectMonorepo(cwd: string): Promise<MonorepoDetection> {
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
