import { createDefu } from 'defu'
import { dump, load } from 'js-yaml'

const mergeYamlDefu = createDefu((obj, key, value) => {
	// Arrays are replaced, not concatenated — consistent with mergeJson and ADR-007
	if (Array.isArray(obj[key])) {
		obj[key] = value
		return true
	}
})

/**
 * Parse a YAML string into a plain object.
 * Returns an empty object if the string is empty or contains only whitespace.
 */
export function parseYaml(text: string): Record<string, unknown> {
	if (text.trim() === '') return {}
	return load(text) as Record<string, unknown>
}

/**
 * Deep-merge a plain object into a YAML string.
 *
 * Parses the source YAML, merges `merge` into it using `defu`
 * (existing keys are preserved; incoming keys fill gaps), and
 * serializes the result back to YAML.
 *
 * Handles empty source: returns the merged object dumped as YAML.
 *
 * @param source - Existing YAML text (e.g. from a config file)
 * @param merge  - Object to deep-merge into the parsed source
 * @returns Merged YAML string
 *
 * @remarks
 * YAML anchors and aliases are resolved on parse and not preserved
 * on dump. If your source YAML uses anchors/aliases extensively,
 * this function will flatten them.
 */
export function mergeYaml(
	source: string,
	merge: Record<string, unknown>,
): string {
	const existing = parseYaml(source)
	const merged = mergeYamlDefu(existing, merge)
	return dump(merged)
}
