const IRREGULAR: Record<string, string> = {
	analyses: 'analysis',
	libraries: 'library',
	dependencies: 'dependency',
	strategies: 'strategy',
	properties: 'property',
	utilities: 'utility',
	varieties: 'variety',
}

const SUFFIXES = ['ing', 'tion', 'ied', 'ies', 'ed', 's']

export function stem(word: string): string {
	const lower = word.toLowerCase()
	if (IRREGULAR[lower]) return IRREGULAR[lower]

	let result = lower
	for (const suffix of SUFFIXES) {
		if (result.endsWith(suffix) && result.length - suffix.length >= 3) {
			result = result.slice(0, -suffix.length)
			break
		}
	}

	return result
}
