#!/usr/bin/env node
import { version } from '^/package.json'
import { defineCommand, runMain } from 'citty'

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
		init: () => import('@/commands/init.js').then((m) => m.initCommand),
		query: () => import('@/commands/query.js').then((m) => m.queryCommand),
		sync: () => import('@/commands/sync.js').then((m) => m.syncCommand),
		diff: () => import('@/commands/diff.js').then((m) => m.diffCommand),
		check: () => import('@/commands/check.js').then((m) => m.checkCommand),
		doctor: () => import('@/commands/doctor.js').then((m) => m.doctorCommand),
		add: () => import('@/commands/add/index.js').then((m) => m.addCommand),
		restore: () =>
			import('@/commands/restore.js').then((m) => m.restoreCommand),
		undo: () => import('@/commands/undo.js').then((m) => m.undoCommand),
		list: () => import('@/commands/list.js').then((m) => m.listCommand),
	},
})

runMain(main)
