import { dirname, relative } from 'pathe'
import { fileExists, resolvePath } from '@/utils/fs.js'
import { isPnpmWorkspace } from '@/utils/pkg.js'
import type { MonorepoDetection } from './types.js'

const MONOREPO_MARKERS = [
	'pnpm-workspace.yaml',
	'turbo.json',
	'nx.json',
	'lerna.json',
]
const WORKSPACE_PACKAGE_DIRS = ['apps/', 'packages/', 'services/']

async function hasMonorepoMarkers(dir: string): Promise<boolean> {
	const results = await Promise.all(
		MONOREPO_MARKERS.map((m) => fileExists(resolvePath(dir, m))),
	)
	if (results.some(Boolean)) {
		return true
	}
	const [hasPackagesDir, hasAppsDir] = await Promise.all([
		fileExists(resolvePath(dir, 'packages')),
		fileExists(resolvePath(dir, 'apps')),
	])
	return hasPackagesDir && hasAppsDir
}

function detectMonorepoTool(flags: {
	hasTurboJson: boolean
	hasNxJson: boolean
	hasLernaJson: boolean
}): 'turbo' | 'nx' | 'lerna' | null {
	if (flags.hasTurboJson) {
		return 'turbo'
	}
	if (flags.hasNxJson) {
		return 'nx'
	}
	if (flags.hasLernaJson) {
		return 'lerna'
	}
	return null
}

async function walkWorkspaceParents(
	cwd: string,
): Promise<MonorepoDetection | null> {
	let current = dirname(cwd)
	while (current !== dirname(current)) {
		if (await hasMonorepoMarkers(current)) {
			const rel = relative(current, cwd)
			const inWorkspacePackage = WORKSPACE_PACKAGE_DIRS.some((p) =>
				rel.startsWith(p),
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
		if (await fileExists(resolvePath(current, '.git'))) {
			break
		}
		current = dirname(current)
	}
	return null
}

/**
 * Detects monorepo structure and tooling
 * @param cwd - Current working directory
 * @returns Monorepo detection information
 */
export async function detectMonorepo(cwd: string): Promise<MonorepoDetection> {
	const [
		hasPnpmWorkspace,
		hasTurboJson,
		hasNxJson,
		hasLernaJson,
		hasPackagesDir,
		hasAppsDir,
	] = await Promise.all([
		isPnpmWorkspace(cwd).then((v) => !!v),
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
	const monorepoTool = detectMonorepoTool({
		hasTurboJson,
		hasNxJson,
		hasLernaJson,
	})
	if (!monorepo) {
		const parentResult = await walkWorkspaceParents(cwd)
		if (parentResult) {
			return parentResult
		}
	}
	return { monorepo, monorepoTool, workspaceRoot: monorepo }
}
