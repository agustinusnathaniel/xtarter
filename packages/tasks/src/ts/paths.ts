import type { ProjectProfile } from '@xtarterize/core'
import { parseJsonc } from '@xtarterize/patchers'
import { createJsonMergeTask } from '@/factory'

function getPathStatus(
	content: string | null,
	profile: ProjectProfile,
): 'missing' | 'match' | 'mismatch' {
	if (!content) return 'missing'
	const parsed = parseJsonc(content)
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return 'missing'
	}
	const tsconfig = parsed as Record<string, unknown>
	const compilerOptions = tsconfig.compilerOptions
	if (
		typeof compilerOptions !== 'object' ||
		compilerOptions === null ||
		Array.isArray(compilerOptions)
	) {
		return 'missing'
	}
	const options = compilerOptions as Record<string, unknown>
	const paths = options.paths
	if (typeof paths !== 'object' || paths === null || Array.isArray(paths)) {
		return 'missing'
	}
	const alias = (paths as Record<string, unknown>)['@/*']
	const validTargets =
		profile.bundler === 'nextjs' ? ['./*', './src/*'] : ['./src/*']
	const hasValidAlias =
		Array.isArray(alias) &&
		alias.some((entry) => validTargets.includes(entry as string))

	if (profile.bundler === 'nextjs') {
		return hasValidAlias ? 'match' : 'mismatch'
	}

	if (!hasValidAlias) return 'mismatch'
	if (options.baseUrl !== '.') return 'mismatch'
	return 'match'
}

export const pathsTask = createJsonMergeTask({
	id: 'ts/paths',
	label: 'tsconfig - path aliases',
	group: 'TypeScript',
	applicable: (profile) => profile.typescript,
	filepath: 'tsconfig.json',
	checkFn: async (_cwd, profile, fullPath, content) => {
		if (!fullPath || !content) return 'new'
		const status = getPathStatus(content, profile)
		if (status === 'match') return 'skip'
		if (status === 'missing') return 'patch'
		return 'conflict'
	},
	incoming: (_cwd, profile) => ({
		compilerOptions: {
			...(profile.bundler === 'nextjs' ? {} : { baseUrl: '.' }),
			paths: {
				'@/*': [profile.bundler === 'nextjs' ? './*' : './src/*'],
			},
		},
	}),
})
