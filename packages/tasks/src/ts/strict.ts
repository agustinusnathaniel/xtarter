import { deepEqual } from '@xtarterize/core'
import { parseJsonc } from '@xtarterize/patchers'
import { createJsonMergeTask } from '@/factory'

const EXPECTED_OPTIONS = {
	strict: true,
	noUnusedLocals: true,
	noUnusedParameters: true,
	verbatimModuleSyntax: true,
} as const

function getCompilerOption(content: string | null, key: string): unknown {
	if (!content) return undefined
	const parsed = parseJsonc(content)
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return undefined
	}
	const tsconfig = parsed as Record<string, unknown>
	const compilerOptions = tsconfig.compilerOptions
	if (
		typeof compilerOptions !== 'object' ||
		compilerOptions === null ||
		Array.isArray(compilerOptions)
	) {
		return undefined
	}
	const options = compilerOptions as Record<string, unknown>
	if (!Object.hasOwn(options, key)) return undefined
	return options[key]
}

export const strictTask = createJsonMergeTask({
	id: 'ts/strict',
	label: 'tsconfig - strict compiler options',
	group: 'TypeScript',
	searchMeta: {
		tags: [
			'typescript',
			'strict',
			'no-unused-locals',
			'no-unused-parameters',
			'verbatim-module-syntax',
			'type-checking',
			'quality',
		],
		configTargets: ['tsconfig.json'],
		keywords: [
			'strict',
			'typescript strict',
			'noUnusedLocals',
			'noUnusedParameters',
			'verbatimModuleSyntax',
			'type checking',
			'strict mode',
			'type safety',
		],
	},
	applicable: (profile) => profile.typescript,
	filepath: 'tsconfig.json',
	checkFn: async ({ fullPath, content }) => {
		if (!fullPath || !content) return 'new'

		let hasMissing = false
		let hasConflict = false

		for (const [key, value] of Object.entries(EXPECTED_OPTIONS)) {
			const actual = getCompilerOption(content, key)
			if (actual === undefined) {
				hasMissing = true
			} else if (!deepEqual(actual, value)) {
				hasConflict = true
			}
		}

		if (hasConflict) return 'conflict'
		if (hasMissing) return 'patch'
		return 'skip'
	},
	incoming: () => ({
		compilerOptions: { ...EXPECTED_OPTIONS },
	}),
})
