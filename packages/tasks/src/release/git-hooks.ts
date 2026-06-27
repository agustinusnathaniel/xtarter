import type { ProjectProfile } from '@xtarterize/core'
import { readPackageJson } from '@xtarterize/core'
import { dlxCommand, runScriptCommand } from 'nypm'
import { createPackageJsonTask } from '@/factory'

function commitMsgHook(pm: string): string {
	return `${dlxCommand(pm, 'commitlint', { short: true })} --edit $1\n`
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
	const pm = profile.packageManager
	return hasLintStaged
		? `${dlxCommand(pm, 'lint-staged', { short: true })}\n`
		: `${dlxCommand(pm, 'biome', { short: true })} check --write\n`
}

function prePushHook(profile: ProjectProfile): string {
	const pm = profile.packageManager
	if (profile.monorepoTool === 'turbo')
		return `${runScriptCommand(pm, 'check:turbo')}\n`
	if (profile.typescript)
		return `${runScriptCommand(pm, 'typecheck')} && ${runScriptCommand(pm, 'test')}\n`
	return `${runScriptCommand(pm, 'test')}\n`
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
