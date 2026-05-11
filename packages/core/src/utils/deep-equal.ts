export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (typeof a !== typeof b) return false
	if (typeof a !== 'object' || a === null || b === null) return false
	if (Array.isArray(a) !== Array.isArray(b)) return false
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false
		return a.every((v, i) => deepEqual(v, i < b.length ? b[i] : undefined))
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
