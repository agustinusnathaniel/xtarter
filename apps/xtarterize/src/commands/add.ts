import { confirm, isCancel, spinner } from '@clack/prompts'
import {
	applyTasks,
	detectProject,
	logError,
	logInfo,
	logSuccess,
	pc,
	runPreflight,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { defineCommand } from 'citty'
import { displayDiffs } from '@/ui/diff-display.js'
import { resolveCwd } from '@/utils/cwd.js'

export const addCommand = defineCommand({
	meta: {
		name: 'add',
		description: 'Add a specific task',
	},
	args: {
		taskId: {
			type: 'positional',
			description: 'Task ID (e.g., lint/biome)',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress interactive prompts',
		},
	},
	async run({ args }) {
		const taskId = args.taskId
		if (!taskId) {
			logError('Task ID required. Usage: xtarterize add <task-id>')
			logInfo('Available tasks:')
			const allTasks = getAllTasks()
			allTasks.forEach((t) => {
				console.log(`  ${t.id}`)
			})
			return
		}

		const cwd = resolveCwd(args)
		const isCI = process.env.CI === 'true' || process.env.CI === '1'
		const quiet = args.quiet || isCI

		const preflight = await runPreflight(cwd)
		if (!preflight.valid) {
			console.log('')
			console.log(`${pc.red('✖')} Preflight checks failed`)
			console.log('')
			for (const error of preflight.errors) {
				console.log(`${pc.red(`  ✗ ${error.message}`)}`)
				if (error.hint) {
					console.log(`  ${pc.dim(error.hint)}`)
				}
			}
			console.log('')
			process.exit(1)
		}

		const s = spinner()
		if (!quiet) s.start('Scanning project...')

		const profile = await detectProject(cwd)
		if (!quiet) s.stop('Project scanned')

		const allTasks = getAllTasks()
		const task = allTasks.find((t) => t.id === taskId)

		if (!task) {
			logError(`Task "${taskId}" not found`)
			logInfo('Available tasks:')
			allTasks.forEach((t) => {
				console.log(`  ${t.id}`)
			})
			return
		}

		if (!task.applicable(profile)) {
			logInfo(`Task "${taskId}" is not applicable for this project`)
			return
		}

		const status = await task.check(cwd, profile)
		if (!quiet) console.log(`Status: ${status}`)

		if (status === 'skip') {
			logSuccess('Already conformant')
			return
		}

		const diffs = await task.dryRun(cwd, profile)
		if (!quiet) displayDiffs(diffs)

		if (!quiet) {
			const proceed = await confirm({ message: 'Apply this change?' })
			if (isCancel(proceed) || !proceed) return
		}

		const result = await applyTasks([task], cwd, profile, [task.id])
		if (result.errors.length > 0) {
			logError(`${result.errors.length} errors`)
			for (const error of result.errors) {
				logError(`  - ${error}`)
			}
			return
		}
		logSuccess(`${task.id} applied successfully`)
	},
})
