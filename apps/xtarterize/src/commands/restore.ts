import { select } from '@clack/prompts'
import type { Backup } from '@xtarterize/core'
import {
	abortIfCancelled,
	createSpinner,
	listBackups,
	logError,
	logSuccess,
	restoreBackup,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCwdWithPreflight } from '@/utils/preflight.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'

export const restoreCommand = defineCommand({
	meta: {
		name: 'restore',
		description: 'Restore a file from backup',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
		filepath: {
			type: 'positional',
			description: 'File to restore (e.g., tsconfig.json)',
		},
		yes: {
			type: 'boolean',
			description: 'Skip confirmation, restore latest backup',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress verbose output',
		},
		json: {
			type: 'boolean',
			description: 'Output machine-readable JSON',
		},
		format: {
			type: 'string',
			description: 'Output format (terminal|json)',
		},
	},
	async run({ args }) {
		const cwd = await resolveCwdWithPreflight(args)
		const filepath = args.filepath
		const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args)
		const jsonMode = format === 'json'
		const quiet = jsonMode || runtimeQuiet
		const yes = args.yes === true || jsonMode

		if (!filepath) {
			if (jsonMode) {
				console.log(JSON.stringify({ ok: false, error: 'File path required' }))
				process.exitCode = 1
				return
			}
			logError('File path required. Usage: xtarterize restore <filepath>')
			process.exitCode = 1
			return
		}

		const s = createSpinner(quiet)
		s.start('Loading backups...')

		const backups = await listBackups(cwd, filepath)
		s.stop('Backups loaded')

		if (backups.length === 0) {
			if (jsonMode) {
				console.log(
					JSON.stringify({ ok: false, filepath, error: 'No backups found' }),
				)
				process.exitCode = 1
				return
			}
			logError(`No backups found for ${filepath}`)
			process.exitCode = 1
			return
		}

		let selected: Backup
		if (backups.length === 1 || yes) {
			selected = backups[0]
		} else {
			const result = await select({
				message: 'Select backup to restore:',
				options: backups.map((b) => ({
					value: b,
					label: `${b.timestamp} - ${b.backupPath}`,
				})),
			})
			abortIfCancelled(result)
			selected = result
		}

		try {
			await restoreBackup(cwd, selected)
			if (jsonMode) {
				console.log(
					JSON.stringify({
						ok: true,
						filepath,
						restoredFrom: selected.backupPath,
						timestamp: selected.timestamp,
					}),
				)
				return
			}
			logSuccess(`Restored ${filepath} from backup`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			if (jsonMode) {
				console.log(JSON.stringify({ ok: false, filepath, error: message }))
				process.exitCode = 1
				return
			}
			logError(`Failed to restore: ${message}`)
			process.exitCode = 1
		}
	},
})
