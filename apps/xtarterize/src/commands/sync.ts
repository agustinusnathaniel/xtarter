import { defineCommand } from 'citty'
import { runCommand, sharedRunArgs } from '@/commands/run-command.js'
import { resolveCwd } from '@/utils/cwd.js'

export const syncCommand = defineCommand({
	meta: {
		name: 'sync',
		description: 'Update existing configurations to latest conformance',
	},
	args: sharedRunArgs,
	async run({ args }) {
		await runCommand(resolveCwd(args), args, {
			actionableStatuses: ['patch', 'conflict'],
			emptyMessage: 'No updates available',
			confirmMessage: 'How would you like to proceed?',
		})
	},
})
