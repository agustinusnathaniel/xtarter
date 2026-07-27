import type { ProjectProfile } from '@xtarterize/core'
import { createJsonMergeTask } from '@/factory'
import { getCompilerOptions } from './utils.js'

function getPathStatus(
	content: string | null,
	profile: ProjectProfile,
): 'missing' | 'match' | 'mismatch' {
	const options = getCompilerOptions(content)
	if (!options) return 'missing'
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
	searchMeta: {
		tags: ['typescript', 'paths', 'aliases', 'imports'],
		configTargets: ['tsconfig.json'],
		keywords: [
			'path aliases',
			'import paths',
			'@ alias',
			'module resolution',
			'tsconfig',
		],
	},
	scope: 'package',
	applicable: (profile) => profile.typescript,
	filepath: 'tsconfig.json',
	checkFn: async ({ profile, fullPath, content }) => {
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
