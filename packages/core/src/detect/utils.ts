// Shared utilities for detection

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isStringRecord(
	value: unknown,
): value is Record<string, string> {
	if (!isRecord(value)) return false
	return Object.values(value).every((v): v is string => typeof v === 'string')
}
