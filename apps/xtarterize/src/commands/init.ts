import { defineCommand } from 'citty'
import { runCommand, sharedRunArgs } from '@/commands/run-command.js'
import { resolveCwd } from '@/utils/cwd.js'

export const initCommand = defineCommand({
	meta: {
		name: 'init',
		description: 'Initialize xtarterize conformance for a project',
	},
	args: sharedRunArgs,
	async run({ args }) {
		await runCommand(resolveCwd(args), args, {
			actionableStatuses: ['new', 'patch', 'conflict'],
			emptyMessage: 'Project is already fully conformant!',
			confirmMessage: 'How would you like to proceed?',
		})
	},
})
