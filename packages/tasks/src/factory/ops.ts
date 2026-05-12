import type { FileDiff } from '@xtarterize/core'
import {
	ensureDir,
	fileExists,
	readPackageJson,
	resolvePath,
	writeFile,
} from '@xtarterize/core'
import { addDependency } from 'nypm'

export async function ensureTaskDependency(options: {
	cwd: string
	depName?: string
	depInstallName?: string
	installDev?: boolean
}): Promise<void> {
	if (!options.depName) return

	const pkg = await readPackageJson(options.cwd)
	const hasDep =
		pkg?.devDependencies?.[options.depName] ||
		pkg?.dependencies?.[options.depName]

	if (hasDep) return

	const isPnpmWorkspaceRoot = await fileExists(
		resolvePath(options.cwd, 'pnpm-workspace.yaml'),
	)

	await addDependency([options.depInstallName ?? options.depName], {
		cwd: options.cwd,
		dev: options.installDev ?? true,
		workspace: isPnpmWorkspaceRoot || undefined,
	})
}

export async function ensureTaskParentDir(
	cwd: string,
	filepath: string,
): Promise<void> {
	const fullPath = resolvePath(cwd, filepath)
	await ensureDir(resolvePath(fullPath, '..'))
}

export function isExecutableFile(filepath: string): boolean {
	return filepath.startsWith('.husky/') || filepath.startsWith('.vite-hooks/')
}

export async function writeTaskDiffs(
	cwd: string,
	diffs: FileDiff[],
): Promise<void> {
	for (const diff of diffs) {
		const fullPath = resolvePath(cwd, diff.filepath)
		await ensureDir(resolvePath(fullPath, '..'))
		await writeFile(
			fullPath,
			diff.after,
			isExecutableFile(diff.filepath) ? 0o755 : undefined,
		)
	}
}
