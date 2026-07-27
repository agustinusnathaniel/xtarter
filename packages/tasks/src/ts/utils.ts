import { parseJsonc } from '@xtarterize/patchers'

/**
 * Safely navigate a tsconfig JSON string to extract the compilerOptions object.
 * Returns null if the content is null, invalid, or doesn't have a valid compilerOptions.
 */
export function getCompilerOptions(
	content: string | null,
): Record<string, unknown> | null {
	if (!content) return null
	const parsed = parseJsonc(content)
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return null
	}
	const tsconfig = parsed as Record<string, unknown>
	const compilerOptions = tsconfig.compilerOptions
	if (
		typeof compilerOptions !== 'object' ||
		compilerOptions === null ||
		Array.isArray(compilerOptions)
	) {
		return null
	}
	return compilerOptions as Record<string, unknown>
}
