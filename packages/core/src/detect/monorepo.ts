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
		const results = await Promise.all(
			markers.map((marker) => fileExists(resolvePath(dir, marker))),
		)
		if (results.some(Boolean)) return true
		const [hasPackagesDir, hasAppsDir] = await Promise.all([
			fileExists(resolvePath(dir, 'packages')),
			fileExists(resolvePath(dir, 'apps')),
		])
		return hasPackagesDir && hasAppsDir
	}

	const [
		hasPnpmWorkspace,
		hasTurboJson,
		hasNxJson,
		hasLernaJson,
		hasPackagesDir,
		hasAppsDir,
	] = await Promise.all([
		fileExists(resolvePath(cwd, 'pnpm-workspace.yaml')),
		fileExists(resolvePath(cwd, 'turbo.json')),
		fileExists(resolvePath(cwd, 'nx.json')),
		fileExists(resolvePath(cwd, 'lerna.json')),
		fileExists(resolvePath(cwd, 'packages')),
		fileExists(resolvePath(cwd, 'apps')),
	])

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
					const [hasTurbo, hasNx, hasLerna] = await Promise.all([
						fileExists(resolvePath(current, 'turbo.json')),
						fileExists(resolvePath(current, 'nx.json')),
						fileExists(resolvePath(current, 'lerna.json')),
					])
					return {
						monorepo: true,
						monorepoTool: hasTurbo
							? 'turbo'
							: hasNx
								? 'nx'
								: hasLerna
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
