import { findConfigFile, resolvePath } from '@xtarterize/core'

export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (typeof a !== typeof b) return false
	if (typeof a !== 'object' || a === null || b === null) return false
	if (Array.isArray(a) !== Array.isArray(b)) return false
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false
		return a.every((v, i) => deepEqual(v, b[i]))
	}
	const aKeys = Object.keys(a as object)
	const bKeys = Object.keys(b as object)
	if (aKeys.length !== bKeys.length) return false
	return aKeys.every((k) =>
		deepEqual(
			(a as Record<string, unknown>)[k],
			(b as Record<string, unknown>)[k],
		),
	)
}

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
