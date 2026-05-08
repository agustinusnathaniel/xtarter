import { createJsonMergeTask } from '@/factory'

export const incrementalTask = createJsonMergeTask({
	id: 'ts/incremental',
	label: 'tsconfig — incremental: true',
	group: 'TypeScript',
	applicable: (profile) => profile.typescript,
	filepath: 'tsconfig.json',
	incoming: () => ({
		compilerOptions: { incremental: true, tsBuildInfoFile: '.tsbuildinfo' },
	}),
})
