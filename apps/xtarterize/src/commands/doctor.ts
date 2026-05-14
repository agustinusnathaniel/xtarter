import os from 'node:os'
import type { DiagnosticCheck } from '@xtarterize/core'
import {
	createSpinner,
	pc,
	runConflictChecks,
	runEnvironmentChecks,
	runPreflight,
	runProjectHealthChecks,
	runToolInstallationChecks,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { formatDoctorResult } from '@/ui/json-formatter.js'
import { resolveCwd } from '@/utils/cwd.js'
import { diagnosticIcon } from '@/utils/display.js'
import { handlePreflightFailure } from '@/utils/preflight.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'

interface DiagnosticGroup {
	title: string
	checks: DiagnosticCheck[]
}

export const doctorCommand = defineCommand({
	meta: {
		name: 'doctor',
		description: 'Run environment and project diagnostics',
	},
	args: {
		quiet: {
			type: 'boolean',
			description: 'Suppress detailed output',
		},
		verbose: {
			type: 'boolean',
			description: 'Show additional system information',
		},
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		const { json, quiet } = resolveRuntimeFlags(args)
		const verbose = args.verbose === true

		const preflight = await runPreflight(cwd)
		handlePreflightFailure(preflight, json)

		const s = createSpinner(quiet)
		s.start('Running diagnostics...')

		const [envChecks, installChecks, healthChecks, conflictChecks] =
			await Promise.all([
				runEnvironmentChecks(cwd),
				runToolInstallationChecks(cwd),
				runProjectHealthChecks(cwd),
				runConflictChecks(cwd),
			])

		const groups: DiagnosticGroup[] = [
			{ title: 'Environment', checks: envChecks },
			{ title: 'Tools', checks: installChecks },
			{ title: 'Project', checks: healthChecks },
			{ title: 'Configuration', checks: conflictChecks },
		]

		if (verbose) {
			const mem = Math.round(os.totalmem() / 1024 ** 3)
			groups.unshift({
				title: 'System',
				checks: [
					{
						name: 'Platform',
						status: 'pass',
						message: `${os.type()} ${os.release()} | ${os.arch()} | ${os.cpus().length} CPUs | ${mem} GB RAM`,
					},
				],
			})
		}

		s.stop('Diagnostics complete')

		const allDiagnostics = groups.flatMap((g) => g.checks)
		const summary = {
			pass: allDiagnostics.filter((d) => d.status === 'pass').length,
			warn: allDiagnostics.filter((d) => d.status === 'warn').length,
			fail: allDiagnostics.filter((d) => d.status === 'fail').length,
			total: allDiagnostics.length,
		}

		if (json) {
			console.log(formatDoctorResult(allDiagnostics))
			return
		}

		if (quiet) {
			console.log(
				`${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed`,
			)
			return
		}

		console.log('')
		console.log(pc.bold('Project Diagnostics'))
		console.log('')

		for (const group of groups) {
			if (group.checks.length === 0) continue

			console.log(`  ${pc.bold(group.title)}`)
			for (const check of group.checks) {
				console.log(`    ${diagnosticIcon(check.status)} ${check.message}`)
			}
			console.log('')
		}

		console.log(
			pc.bold(
				`${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed (${summary.total} checks)`,
			),
		)
		console.log('')
	},
})
