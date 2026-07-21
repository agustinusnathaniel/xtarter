import { createJsonMergeTask } from '@/factory'

export const versionrcTask = createJsonMergeTask({
	id: 'release/versionrc',
	label: '.versionrc.json - changelog configuration',
	group: 'Release',
	searchMeta: {
		tags: ['release', 'version', 'changelog', 'semver', 'conventional-commits'],
		configTargets: ['.versionrc.json'],
		keywords: [
			'versionrc',
			'changelog',
			'release',
			'conventional commits',
			'standard-version',
			'commit-and-tag-version',
		],
	},
	scope: 'root',
	applicable: () => true,
	filepath: '.versionrc.json',
	incoming: () => ({
		bumpFiles: ['package.json'],
		types: [
			{ type: 'feat', section: 'Features' },
			{ type: 'fix', section: 'Bug Fixes' },
			{ type: 'refactor', section: 'Code Refactoring' },
			{ type: 'perf', section: 'Performance Improvements' },
			{ type: 'docs', section: 'Documentation', hidden: true },
			{ type: 'style', section: 'Styles', hidden: true },
			{ type: 'test', section: 'Tests', hidden: true },
			{ type: 'chore', section: 'Chores', hidden: true },
			{ type: 'ci', section: 'CI/CD', hidden: true },
			{ type: 'build', section: 'Build System', hidden: true },
			{ type: 'revert', section: 'Reverts', hidden: true },
		],
	}),
})
