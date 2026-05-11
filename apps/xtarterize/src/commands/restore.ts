import { isCancel, select, spinner } from '@clack/prompts'
import {
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
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		const filepath = args.filepath
		if (!filepath) {
			logError('File path required. Usage: xtarterize restore <filepath>')
			return
		}

		const s = spinner()
		s.start('Loading backups...')

		const backups = await listBackups(cwd, filepath)
		s.stop('Backups loaded')

		if (backups.length === 0) {
			logError(`No backups found for ${filepath}`)
			return
		}

		if (backups.length === 1) {
			await restoreBackup(cwd, backups[0])
			logSuccess(`Restored ${filepath} from backup`)
			return
		}

		const selected = await select({
			message: 'Select backup to restore:',
			options: backups.map((b) => ({
				value: b,
				label: `${b.timestamp} - ${b.backupPath}`,
			})),
		})

		if (isCancel(selected)) return

		await restoreBackup(cwd, selected)
		logSuccess(`Restored ${filepath} from backup`)
	},
})
