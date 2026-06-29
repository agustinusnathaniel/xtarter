import { readPackageJson } from '@xtarterize/core'
import { createPackageJsonTask } from '@/factory'

async function lintCmd(cwd: string): Promise<string> {
	const pkg = await readPackageJson(cwd)
	const hasUltracite = !!(
		pkg?.devDependencies?.ultracite || pkg?.dependencies?.ultracite
	)
	return hasUltracite ? 'ultracite fix' : 'biome check --write'
}

export const lintStagedTask = createPackageJsonTask({
	id: 'quality/lint-staged',
	label: 'lint-staged config',
	group: 'Quality',
	searchMeta: {
		tags: ['git-hooks', 'pre-commit', 'linting', 'quality'],
		configTargets: ['.lintstagedrc.json'],
		keywords: [
			'lint-staged',
			'staged files',
			'pre-commit',
			'git hook',
			'quality gate',
		],
	},
	applicable: (profile) => !profile.vitePlus,
	depName: 'lint-staged',
	installDev: true,
	files: [
		{
			filepath: '.lintstagedrc.json',
			render: async (cwd) => {
				const cmd = await lintCmd(cwd)
				return `${JSON.stringify(
					{
						'*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}': [cmd],
						'*.{json,md,yaml,yml}': [cmd],
					},
					null,
					2,
				)}\n`
			},
		},
	],
})
