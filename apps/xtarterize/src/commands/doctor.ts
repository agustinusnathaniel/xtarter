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
import { printTiming } from '@/utils/timing-display.js'

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

		const diagStart = performance.now()
		const results = await Promise.allSettled([
			runEnvironmentChecks(cwd),
			runToolInstallationChecks(cwd),
			runProjectHealthChecks(cwd),
			runConflictChecks(cwd),
		])

		const envChecks =
			results[0].status === 'fulfilled'
				? results[0].value
				: ([
						{
							name: 'Environment',
							status: 'fail' as const,
							message: 'Failed to run environment checks',
						},
					] as DiagnosticCheck[])
		const installChecks =
			results[1].status === 'fulfilled'
				? results[1].value
				: ([
						{
							name: 'Tools',
							status: 'fail' as const,
							message: 'Failed to run tool checks',
						},
					] as DiagnosticCheck[])
		const healthChecks =
			results[2].status === 'fulfilled'
				? results[2].value
				: ([
						{
							name: 'Project',
							status: 'fail' as const,
							message: 'Failed to run project health checks',
						},
					] as DiagnosticCheck[])
		const conflictChecks =
			results[3].status === 'fulfilled'
				? results[3].value
				: ([
						{
							name: 'Configuration',
							status: 'fail' as const,
							message: 'Failed to run conflict checks',
						},
					] as DiagnosticCheck[])

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

		const diagMs = performance.now() - diagStart
		console.log(
			pc.bold(
				`${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed (${summary.total} checks)`,
			),
		)
		printTiming({ detectionMs: diagMs, resolutionMs: 0, resolutionSumMs: 0 })
	},
})
