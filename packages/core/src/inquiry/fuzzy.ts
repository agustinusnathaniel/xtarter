/** Levenshtein distance between two strings */
export function levenshtein(a: string, b: string): number {
	if (a.length === 0) return b.length
	if (b.length === 0) return a.length

	const matrix: number[][] = []
	for (let i = 0; i <= b.length; i++) matrix[i] = [i]
	for (let j = 0; j <= a.length; j++) matrix[0][j] = j

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1]
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1,
				)
			}
		}
	}
	return matrix[b.length][a.length]
}

/** Normalized similarity score (0.0 - 1.0) from Levenshtein distance */
export function similarity(a: string, b: string): number {
	if (a === b) return 1.0
	const dist = levenshtein(a.toLowerCase(), b.toLowerCase())
	const maxLen = Math.max(a.length, b.length)
	if (maxLen === 0) return 1.0
	return 1.0 - dist / maxLen
}
