import { createFileTask } from '@/factory'

function pnpmWorkspaceContent(): string {
	return ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n')
}

export const pnpmWorkspaceTask = createFileTask({
	id: 'workspace/pnpm-workspace',
	label: 'pnpm-workspace.yaml - pnpm workspace config',
	group: 'Monorepo',
	searchMeta: {
		tags: ['monorepo', 'workspace', 'pnpm', 'package-manager'],
		configTargets: ['pnpm-workspace.yaml'],
		keywords: [
			'pnpm',
			'workspace',
			'monorepo',
			'pnpm-workspace',
			'package manager',
		],
	},
	scope: 'root',
	applicable: (profile) => profile.packageManager === 'pnpm',
	filepath: 'pnpm-workspace.yaml',
	render: () => pnpmWorkspaceContent(),
})
