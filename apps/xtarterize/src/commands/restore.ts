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
import { resolveCwd } from '@/utils/cwd.js'

export const restoreCommand = defineCommand({
	meta: {
		name: 'restore',
		description: 'Restore a file from backup',
	},
	args: {
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
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		const filepath = args.filepath
		const yes = args.yes === true
		const quiet = args.quiet === true

		if (!filepath) {
			logError('File path required. Usage: xtarterize restore <filepath>')
			return
		}

		const s = createSpinner(quiet)
		s.start('Loading backups...')

		const backups = await listBackups(cwd, filepath)
		s.stop('Backups loaded')

		if (backups.length === 0) {
			logError(`No backups found for ${filepath}`)
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
			logSuccess(`Restored ${filepath} from backup`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to restore: ${message}`)
		}
	},
})
