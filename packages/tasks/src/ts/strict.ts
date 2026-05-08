import { parseJsonc } from '@xtarterize/patchers'
import { createJsonMergeTask } from '@/factory'

function getStrictValue(content: string | null): boolean | undefined {
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
	if (!Object.hasOwn(options, 'strict')) return undefined
	return options.strict === true
}

export const strictTask = createJsonMergeTask({
	id: 'ts/strict',
	label: 'tsconfig - strict: true',
	group: 'TypeScript',
	applicable: (profile) => profile.typescript,
	filepath: 'tsconfig.json',
	checkFn: async (_cwd, _profile, fullPath, content) => {
		if (!fullPath || !content) return 'new'
		const value = getStrictValue(content)
		if (value === undefined) return 'patch'
		if (value === true) return 'skip'
		return 'conflict'
	},
	incoming: () => ({
		compilerOptions: { strict: true },
	}),
})
