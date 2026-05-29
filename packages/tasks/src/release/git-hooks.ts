import type { ProjectProfile } from '@xtarterize/core'
import { readPackageJson } from '@xtarterize/core'
import { createPackageJsonTask } from '@/factory'

function commitMsgHook(pm: string): string {
	return `${pm} commitlint --edit $1\n`
}

async function preCommitHook(
	_cwd: string,
	profile: ProjectProfile,
): Promise<string> {
	if (profile.vitePlus) return 'vp staged\n'
	const pkg = await readPackageJson(_cwd)
	const hasLintStaged = !!(
		pkg?.devDependencies?.['lint-staged'] || pkg?.dependencies?.['lint-staged']
	)
	return hasLintStaged ? 'npx lint-staged\n' : 'pnpm biome check --write\n'
}

function prePushHook(profile: ProjectProfile): string {
	if (profile.monorepoTool === 'turbo') return 'pnpm check:turbo\n'
	if (profile.typescript) return 'pnpm typecheck && pnpm test\n'
	return 'pnpm test\n'
}

export const gitHooksTask = createPackageJsonTask({
	id: 'release/git-hooks',
	label: 'Git hooks (commit-msg, pre-commit, pre-push)',
	group: 'Release',
	applicable: () => true,
	depName: 'husky',
	depCondition: (profile) => !profile.vitePlus,
	installDev: true,
	getScripts: async (_cwd, profile) =>
		profile.vitePlus ? [] : [{ script: 'prepare', value: 'husky' }],
	files: [
		{
			filepath: (profile) =>
				profile.vitePlus ? '.vite-hooks/commit-msg' : '.husky/commit-msg',
			render: (_cwd, profile) => commitMsgHook(profile.packageManager),
		},
		{
			filepath: (profile) =>
				profile.vitePlus ? '.vite-hooks/pre-commit' : '.husky/pre-commit',
			render: (cwd, profile) => preCommitHook(cwd, profile),
		},
		{
			filepath: (profile) =>
				profile.vitePlus ? '.vite-hooks/pre-push' : '.husky/pre-push',
			render: (_cwd, profile) => prePushHook(profile),
		},
	],
})
