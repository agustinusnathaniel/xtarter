import { confirm } from '@clack/prompts'
import {
	abortIfCancelled,
	createSpinner,
	ensureXtarterizeGitignore,
	listBackups,
	logError,
	logInfo,
	logSuccess,
	readRunManifest,
	restoreBackup,
	runPreflight,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCwd } from '@/utils/cwd.js'
import { handlePreflightFailure } from '@/utils/preflight.js'

export const undoCommand = defineCommand({
	meta: {
		name: 'undo',
		description: 'Undo the last xtarterize run by restoring backed-up files',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress interactive prompts (auto-confirm)',
		},
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		await ensureXtarterizeGitignore(cwd)
		const preflight = await runPreflight(cwd)
		handlePreflightFailure(preflight, false)
		const quiet = args.quiet === true

		const s = createSpinner(quiet)
		s.start('Reading last run manifest...')

		const manifest = await readRunManifest(cwd)
		s.stop('Manifest loaded')

		if (!manifest || manifest.files.length === 0) {
			logError('No previous run found. Nothing to undo.')
			logInfo('Run `xtarterize init` or `xtarterize add` first.')
			return
		}

		console.log('')
		console.log(`Last run: ${manifest.timestamp}`)
		console.log(`Files modified: ${manifest.files.length}`)
		console.log('')

		for (const filepath of manifest.files) {
			console.log(`  ${filepath}`)
		}
		console.log('')

		if (!quiet) {
			const proceed = await confirm({
				message: `Restore ${manifest.files.length} file(s) to their previous state?`,
			})
			abortIfCancelled(proceed, 'Undo cancelled')
			if (!proceed) return
		}

		s.start('Restoring files...')

		let restored = 0
		const errors: string[] = []

		for (const filepath of manifest.files) {
			try {
				const backups = await listBackups(cwd, filepath)
				if (backups.length === 0) {
					errors.push(`No backup found for ${filepath}`)
					continue
				}
				// Restore the most recent backup (first in sorted list)
				await restoreBackup(cwd, backups[0])
				restored++
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				errors.push(`${filepath}: ${message}`)
			}
		}

		s.stop('Files restored')

		console.log('')
		if (errors.length > 0) {
			logError(`${errors.length} error(s):`)
			for (const error of errors) {
				logError(`  - ${error}`)
			}
		}

		logSuccess(`Restored ${restored}/${manifest.files.length} files`)
	},
})
