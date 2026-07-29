import type { FileDiff } from '@xtarterize/core'
import {
	ensureDir,
	installDependency,
	resolvePath,
	TaskError,
	writeFile,
} from '@xtarterize/core'

export function wrapTask<A>(
	taskId: string,
	method: string,
	fn: () => Promise<A>,
): Promise<A> {
	return fn().catch((cause) => {
		throw new TaskError({
			taskId,
			message: `${method} failed: ${String(cause)}`,
			cause,
		})
	})
}

/**
 * Check if required dependencies are missing from package.json.
 * Returns 'patch' if any dep is missing, null if all present or no deps specified.
 */
export async function checkMissingDeps(
	cwd: string,
	options: { depName?: string; depNames?: string[] },
): Promise<'patch' | null> {
	if (!options.depName && !options.depNames) return null
	const { readPackageJson } = await import('@xtarterize/core')
	const pkg = await readPackageJson(cwd)
	const deps = options.depNames ?? (options.depName ? [options.depName] : [])
	for (const dep of deps) {
		if (!pkg?.devDependencies?.[dep] && !pkg?.dependencies?.[dep]) {
			return 'patch'
		}
	}
	return null
}

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
