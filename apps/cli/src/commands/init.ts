import { defineCommand } from 'citty'
import { runCommand } from '@/commands/run-command.js'
import { resolveCwd } from '@/utils/cwd.js'

export const initCommand = defineCommand({
	meta: {
		name: 'init',
		description: 'Initialize xtarterize conformance for a project',
	},
	args: {
		dryRun: {
			type: 'boolean',
			description: 'Preview all changes without applying',
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
			actionableStatuses: ['new', 'patch', 'conflict'],
			emptyMessage: 'Project is already fully conformant!',
			confirmMessage: 'How would you like to proceed?',
		})
	},
})
