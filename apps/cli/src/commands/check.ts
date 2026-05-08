import { spinner } from '@clack/prompts'
import type { DiagnosticCheck } from '@xtarterize/core'
import {
	detectProject,
	pc,
	resolveTaskStatuses,
	resolveTasks,
	runConflictChecks,
	runPreflight,
	runToolInstallationChecks,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { defineCommand } from 'citty'
import { resolveCwd } from '@/utils/cwd.js'
import { handlePreflightFailure } from '@/utils/preflight.js'

function diagnosticIcon(status: DiagnosticCheck['status']): string {
	switch (status) {
		case 'pass':
			return pc.green('✔')
		case 'warn':
			return pc.yellow('~')
		case 'fail':
			return pc.red('✗')
	}
}

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
		const cwd = resolveCwd(args)
		const json = args.json === true
		const isCI = process.env.CI === 'true' || process.env.CI === '1'
		const quiet = args.quiet || isCI || json

		const preflight = await runPreflight(cwd)
		handlePreflightFailure(preflight, json)

		const s = spinner()
		if (!quiet) s.start('Scanning project...')

		const profile = await detectProject(cwd)
		const allTasks = getAllTasks()
		const tasks = resolveTasks(profile, allTasks)
		const statuses = await resolveTaskStatuses(tasks, cwd, profile)
		if (!quiet) s.stop('Project scanned')

		let conformant = 0
		const total = tasks.length
		const conflictChecks = await runConflictChecks(cwd)
		const installChecks = await runToolInstallationChecks(cwd)
		const diagnostics = [...installChecks, ...conflictChecks]

		for (const task of tasks) {
			const status = statuses.get(task.id) ?? 'new'
			if (status === 'skip') conformant++
		}

		if (json) {
			console.log(
				JSON.stringify({
					ok: true,
					summary: { conformant, total },
					tasks: tasks.map((task) => ({
						id: task.id,
						label: task.label,
						group: task.group,
						status: statuses.get(task.id) ?? 'new',
					})),
					diagnostics,
				}),
			)
			return
		}

		if (!quiet) {
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
					`  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} [${status}]`,
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
		} else {
			console.log(`${conformant}/${total} conformant`)
		}
	},
})
