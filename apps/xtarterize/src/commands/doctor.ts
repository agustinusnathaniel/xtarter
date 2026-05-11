import {
	createSpinner,
	pc,
	runConflictChecks,
	runPreflight,
	runToolInstallationChecks,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCwd } from '@/utils/cwd.js'
import { diagnosticIcon } from '@/utils/display.js'
import { handlePreflightFailure } from '@/utils/preflight.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'

export const doctorCommand = defineCommand({
	meta: {
		name: 'doctor',
		description: 'Run environment and tooling diagnostics',
	},
	args: {
		quiet: {
			type: 'boolean',
			description: 'Suppress verbose output',
		},
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		const { json, quiet } = resolveRuntimeFlags(args)

		const preflight = await runPreflight(cwd)
		handlePreflightFailure(preflight, json)

		const s = createSpinner(quiet)
		s.start('Running diagnostics...')

		const [installChecks, conflictChecks] = await Promise.all([
			runToolInstallationChecks(cwd),
			runConflictChecks(cwd),
		])
		const diagnostics = [...installChecks, ...conflictChecks]

		s.stop('Diagnostics complete')

		const summary = {
			pass: diagnostics.filter((d) => d.status === 'pass').length,
			warn: diagnostics.filter((d) => d.status === 'warn').length,
			fail: diagnostics.filter((d) => d.status === 'fail').length,
			total: diagnostics.length,
		}

		if (json) {
			console.log(JSON.stringify({ ok: true, summary, diagnostics }))
			return
		}

		if (quiet) {
			console.log(
				`${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`,
			)
			return
		}

		console.log('')
		console.log(pc.bold('Environment diagnostics'))
		console.log('')
		for (const check of diagnostics) {
			console.log(`  ${diagnosticIcon(check.status)} ${check.message}`)
		}
		console.log('')
		console.log(
			pc.bold(
				`${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail (${summary.total} checks)`,
			),
		)
		console.log('')
	},
})
