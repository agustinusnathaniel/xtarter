import { defineCommand } from 'citty'
import { runCommand } from '@/commands/run-command.js'
import { resolveCwd } from '@/utils/cwd.js'

export const syncCommand = defineCommand({
	meta: {
		name: 'sync',
		description: 'Update existing configurations to latest conformance',
	},
	args: {
		dryRun: {
			type: 'boolean',
			description: 'Preview changes without applying',
		},
		yes: {
			type: 'boolean',
			description: 'Skip all confirmations, apply all',
		},
		skip: {
			type: 'string',
			description: 'Exclude a specific task (comma-separated)',
		},
		only: {
			type: 'string',
			description: 'Apply only a specific task',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress interactive prompts and verbose output',
		},
		includeConflicts: {
			type: 'boolean',
			description: 'Include conflicting tasks when applying (default: false)',
		},
	},
	async run({ args }) {
		await runCommand(resolveCwd(args), args, {
			actionableStatuses: ['patch', 'conflict'],
			emptyMessage: 'No updates available',
			confirmMessage: 'How would you like to proceed?',
		})
	},
})
