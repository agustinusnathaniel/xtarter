import { runPreflight } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { runCommand, sharedRunArgs } from '@/commands/run-command.js'
import { resolveCwd } from '@/utils/cwd.js'
import { handlePreflightFailure } from '@/utils/preflight.js'

export const syncCommand = defineCommand({
	meta: {
		name: 'sync',
		description: 'Update existing configurations to latest conformance',
	},
	args: sharedRunArgs,
	async run({ args }) {
		const cwd = resolveCwd(args)
		const preflight = await runPreflight(cwd)
		handlePreflightFailure(preflight, false)
		await runCommand(cwd, args, {
			actionableStatuses: ['patch', 'conflict'],
			emptyMessage: 'No updates available',
			confirmMessage: 'How would you like to proceed?',
		})
	},
})
