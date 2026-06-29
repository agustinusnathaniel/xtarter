import { createFileTask } from '@/factory'
import { renderCommitlintConfig } from '@/templates/commitlint-config.js'

export const commitlintTask = createFileTask({
	id: 'release/commitlint',
	label: 'Commitlint config',
	group: 'Release',
	searchMeta: {
		tags: ['commit', 'linting', 'conventional-commits'],
		configTargets: ['commitlint.config.ts'],
		keywords: [
			'commitlint',
			'commit message',
			'conventional commits',
			'lint commit',
		],
	},
	scope: 'root',
	applicable: () => true,
	filepath: 'commitlint.config',
	extensions: ['.ts', '.js', '.mjs', '.mts', '.cts'],
	render: (profile, _existing) => renderCommitlintConfig(profile),
	checkFn: async ({ fullPath, content }) => {
		if (!fullPath || !content) return 'new'
		// Check if the config already extends @commitlint/config-conventional
		const hasExtends = /['"]@commitlint\/config-conventional['"]/.test(content)
		return hasExtends ? 'skip' : 'conflict'
	},
})
