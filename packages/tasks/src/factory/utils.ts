import { findConfigFile, resolvePath } from '@xtarterize/core'

export function normalizeExtends<T extends object>(obj: T): T {
	if (!('extends' in obj)) return obj
	const ext = (obj as Record<string, unknown>).extends
	if (typeof ext === 'string') {
		return { ...obj, extends: [ext] } as T
	}
	return obj
}

export function normalizeLineEndings(value: string): string {
	return value.replace(/\r\n/g, '\n')
}

export function getDefaultFilepath(
	filepath: string,
	extensions?: string[],
): string {
	if (!extensions || extensions.length === 0) return filepath
	const hasExt = extensions.some((ext) => filepath.endsWith(ext))
	return hasExt ? filepath : `${filepath}${extensions[0]}`
}

export async function resolveTaskFile(
	cwd: string,
	filepath: string,
	extensions?: string[],
): Promise<string | null> {
	if (extensions) {
		const lastDot = filepath.lastIndexOf('.')
		if (lastDot !== -1) {
			const ext = filepath.slice(lastDot)
			if (extensions.includes(ext)) {
				const base = filepath.slice(0, lastDot)
				return findConfigFile(cwd, base, extensions)
			}
		}
		return findConfigFile(cwd, filepath, extensions)
	}
	return resolvePath(cwd, filepath)
}
