import { createDefu } from 'defu'
import JSON5 from 'json5'
import { applyEdits, modify } from 'jsonc-parser'

const mergeJsonDefu = createDefu((obj, key, value) => {
	if (Array.isArray(obj[key])) {
		obj[key] = value
		return true
	}
})

export function parseJsonc(text: string): unknown {
	return JSON5.parse(text)
}

export function mergeJson(existing: object, incoming: object): object {
	return mergeJsonDefu(existing, incoming)
}

function detectIndent(text: string): {
	insertSpaces: boolean
	tabSize: number
} {
	const match = text.match(/\n([ \t]+)\S/)
	if (match) {
		const indent = match[1]
		return {
			insertSpaces: indent[0] === ' ',
			tabSize: indent.length,
		}
	}
	return { insertSpaces: true, tabSize: 2 }
}

function deepEqual(a: unknown, b: unknown): boolean {
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

function collectPatchOps(
	existing: unknown,
	incoming: unknown,
	context: {
		path: (string | number)[]
		ops: { path: (string | number)[]; value: unknown }[]
	},
): void {
	const { path, ops } = context
	if (
		typeof incoming !== 'object' ||
		incoming === null ||
		Array.isArray(incoming)
	) {
		if (!deepEqual(existing, incoming)) {
			ops.push({ path, value: incoming })
		}
		return
	}

	if (
		typeof existing !== 'object' ||
		existing === null ||
		Array.isArray(existing)
	) {
		ops.push({ path, value: incoming })
		return
	}

	const existingObj = existing as Record<string, unknown>
	const incomingObj = incoming as Record<string, unknown>

	for (const [key, value] of Object.entries(incomingObj)) {
		if (!(key in existingObj)) {
			ops.push({ path: [...path, key], value })
		} else {
			collectPatchOps(existingObj[key], value, { path: [...path, key], ops })
		}
	}
}

/**
 * Surgically patch a JSON/JSONC text with an incoming object,
 * preserving key order, comments, and formatting.
 */
export function patchJson(text: string, incoming: object): string {
	const existing = parseJsonc(text) as Record<string, unknown>
	const ops: { path: (string | number)[]; value: unknown }[] = []
	collectPatchOps(existing, incoming, { path: [], ops })

	if (ops.length === 0) return text

	const { insertSpaces, tabSize } = detectIndent(text)
	const formattingOptions = { insertSpaces, tabSize }

	// Sort by path length descending so deeper paths are applied first
	// (avoids position shifts for nested edits)
	ops.sort((a, b) => b.path.length - a.path.length)

	let result = text
	for (const op of ops) {
		const edits = modify(result, op.path, op.value, {
			formattingOptions,
		})
		result = applyEdits(result, edits)
	}

	return result
}
