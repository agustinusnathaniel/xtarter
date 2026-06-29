import { createJsonMergeTask } from '@/factory'

export const incrementalTask = createJsonMergeTask({
	id: 'ts/incremental',
	label: 'tsconfig — incremental: true',
	group: 'TypeScript',
	searchMeta: {
		tags: ['typescript', 'performance', 'build-speed'],
		configTargets: ['tsconfig.json'],
		keywords: [
			'incremental',
			'build speed',
			'typescript performance',
			'watch mode',
		],
	},
	applicable: (profile) => profile.typescript,
	filepath: 'tsconfig.json',
	incoming: () => ({
		compilerOptions: { incremental: true, tsBuildInfoFile: '.tsbuildinfo' },
	}),
})
