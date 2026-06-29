import { createFileTask } from '@/factory'

const ENTRIES = ['*.tsbuildinfo', '.tsbuildinfo/']

export const gitignoreTsbuildinfoTask = createFileTask({
	id: 'gitignore/tsbuildinfo',
	label: '.gitignore — tsbuildinfo',
	group: 'TypeScript',
	scope: 'root',
	applicable: (profile) => profile.typescript,
	filepath: '.gitignore',
	render: (_profile, existing) => {
		const missing = ENTRIES.filter((entry) => !existing?.includes(entry))
		if (missing.length === 0) return existing ?? ''
		const header = '# TypeScript incremental build info'
		if (!existing) {
			return `${header}\n${missing.map((e) => e).join('\n')}\n`
		}
		return `${existing.replace(/\n*$/, '')}\n\n${header}\n${missing.map((e) => e).join('\n')}\n`
	},
	checkFn: async ({ content }) => {
		if (!content) return 'new'
		const allPresent = ENTRIES.every((entry) => content.includes(entry))
		return allPresent ? 'skip' : 'patch'
	},
})
