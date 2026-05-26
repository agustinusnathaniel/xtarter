import {
	pc,
	runConflictChecks,
	runToolInstallationChecks,
	statusTag,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { formatCheckResult } from '@/ui/json-formatter.js'
import { diagnosticIcon } from '@/utils/display.js'
import { resolveCliContext, scanProject } from '@/utils/project.js'
import { printTiming } from '@/utils/timing-display.js'

export const checkCommand = defineCommand({
	meta: {
		name: 'check',
		description: 'Audit current conformance status',
	},
	args: {
		verbose: {
			type: 'boolean',
			description: 'Show tool installation and conflict checks',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress verbose output',
		},
	},
	async run({ args }) {
		const ctx = resolveCliContext(args)
		const { tasks, statuses, timing } = await scanProject(ctx)

		const conflictChecks = await runConflictChecks(ctx.cwd)
		const installChecks = await runToolInstallationChecks(ctx.cwd)
		const diagnostics = [...installChecks, ...conflictChecks]

		if (ctx.json) {
			console.log(formatCheckResult({ tasks, statuses, diagnostics, timing }))
			return
		}

		const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length
		const total = tasks.length

		if (!ctx.quiet) {
			console.log('')
			console.log(pc.bold('Conformance audit'))
			console.log('')

			for (const task of tasks) {
				const status = statuses.get(task.id) ?? 'new'
				const icon =
					status === 'skip'
						? pc.green('✔')
						: status === 'patch'
							? pc.yellow('~')
							: status === 'conflict'
								? pc.red('⚠')
								: pc.red('✗')

				console.log(
					`  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} ${statusTag(status)}`,
				)
			}

			console.log('')
			console.log(pc.bold(`${conformant}/${total} conformant`))

			if (diagnostics.length > 0) {
				console.log('')
				console.log(pc.bold('Diagnostics'))
				console.log('')

				for (const check of diagnostics) {
					console.log(`  ${diagnosticIcon(check.status)} ${check.message}`)
				}
			}

			console.log('')
			printTiming(timing)
		} else {
			console.log(`${conformant}/${total} conformant`)
		}
	},
})
