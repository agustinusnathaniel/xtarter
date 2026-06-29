#!/usr/bin/env node
import { version } from '^/package.json'
import { defineCommand, runMain } from 'citty'
import { addCommand } from '@/commands/add.js'
import { checkCommand } from '@/commands/check.js'
import { diffCommand } from '@/commands/diff.js'
import { doctorCommand } from '@/commands/doctor.js'
import { initCommand } from '@/commands/init.js'
import { listCommand } from '@/commands/list.js'
import { queryCommand } from '@/commands/query.js'
import { restoreCommand } from '@/commands/restore.js'
import { syncCommand } from '@/commands/sync.js'
import { undoCommand } from '@/commands/undo.js'

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

const main = defineCommand({
	meta: {
		name: 'xtarterize',
		version,
		description: 'Apply conformance configuration to JS/TS projects',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
		json: {
			type: 'boolean',
			description: 'Output machine-readable JSON',
		},
		timing: {
			type: 'boolean',
			description: 'Show detailed per-task timing breakdown',
		},
	},
	subCommands: {
		init: initCommand,
		query: queryCommand,
		sync: syncCommand,
		diff: diffCommand,
		check: checkCommand,
		doctor: doctorCommand,
		add: addCommand,
		restore: restoreCommand,
		undo: undoCommand,
		list: listCommand,
	},
})

runMain(main)
