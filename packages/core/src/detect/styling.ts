import type { Styling } from './types.js'

/**
 * Detects styling solutions from package dependencies
 * @param deps - Record of package names to versions
 * @returns Array of detected styling solutions
 */
export function detectStyling(deps: Record<string, string>): Styling[] {
	const result: Styling[] = []
	if (deps.tailwindcss || deps['@tailwindcss/vite']) result.push('tailwind')
	if (deps['styled-components']) result.push('styled-components')
	if (deps['@vanilla-extract/css']) result.push('vanilla-extract')
	if (deps.nativewind) result.push('nativewind')
	if (result.length === 0) result.push('vanilla')
	return result
}
