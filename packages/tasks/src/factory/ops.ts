import type { FileDiff } from '@xtarterize/core'
import {
	ensureDir,
	installDependency,
	resolvePath,
	writeFile,
} from '@xtarterize/core'

export async function ensureTaskDependency(options: {
	cwd: string
	depName?: string
	depInstallName?: string
	installDev?: boolean
}): Promise<void> {
	if (!options.depName) return
	await installDependency(
		options.cwd,
		options.depInstallName ?? options.depName,
		options.installDev ?? true,
	)
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
