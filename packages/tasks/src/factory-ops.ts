import type { FileDiff } from '@xtarterize/core'
import {
	ensureDir,
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

	await addDependency([options.depInstallName ?? options.depName], {
		cwd: options.cwd,
		dev: options.installDev ?? true,
	})
}

export async function ensureTaskParentDir(
	cwd: string,
	filepath: string,
): Promise<void> {
	const fullPath = resolvePath(cwd, filepath)
	await ensureDir(resolvePath(fullPath, '..'))
}

export async function writeTaskDiffs(
	cwd: string,
	diffs: FileDiff[],
): Promise<void> {
	for (const diff of diffs) {
		const fullPath = resolvePath(cwd, diff.filepath)
		await ensureDir(resolvePath(fullPath, '..'))
		await writeFile(fullPath, diff.after)
	}
}
