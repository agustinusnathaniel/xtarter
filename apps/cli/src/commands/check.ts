import type { DiagnosticCheck } from '@xtarterize/core'
import {
	pc,
	runConflictChecks,
	runToolInstallationChecks,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCliContext, scanProject } from '@/utils/project.js'

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
		const ctx = resolveCliContext(args)
		const { profile, tasks, statuses } = await scanProject(ctx)

		let conformant = 0
		const total = tasks.length
		const conflictChecks = await runConflictChecks(ctx.cwd)
		const installChecks = await runToolInstallationChecks(ctx.cwd)
		const diagnostics = [...installChecks, ...conflictChecks]

		for (const task of tasks) {
			const status = statuses.get(task.id) ?? 'new'
			if (status === 'skip') conformant++
		}

		if (ctx.json) {
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
