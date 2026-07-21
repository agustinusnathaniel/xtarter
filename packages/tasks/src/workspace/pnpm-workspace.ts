import type { ProjectProfile } from '@xtarterize/core'
import { createFileTask } from '@/factory'

function pnpmWorkspaceContent(profile: ProjectProfile): string {
	if (profile.monorepo) {
		return ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n')
	}
	return '# pnpm workspace config\n'
}

export const pnpmWorkspaceTask = createFileTask({
	id: 'workspace/pnpm-workspace',
	label: 'pnpm-workspace.yaml - pnpm workspace config',
	group: 'Workspace',
	searchMeta: {
		tags: ['workspace', 'pnpm', 'package-manager'],
		configTargets: ['pnpm-workspace.yaml'],
		keywords: [
			'pnpm',
			'workspace',
			'monorepo',
			'single-package',
			'pnpm-workspace',
			'package manager',
		],
	},
	scope: 'root',
	applicable: (profile) => profile.packageManager === 'pnpm',
	filepath: 'pnpm-workspace.yaml',
	render: (profile, _existing) => pnpmWorkspaceContent(profile),
})
