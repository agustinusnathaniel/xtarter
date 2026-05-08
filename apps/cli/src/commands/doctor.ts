import { spinner } from '@clack/prompts'
import type { DiagnosticCheck } from '@xtarterize/core'
import {
	pc,
	runConflictChecks,
	runPreflight,
	runToolInstallationChecks,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCwd } from '@/utils/cwd.js'

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
		const json = args.json ?? false
		const isCI = process.env.CI === 'true' || process.env.CI === '1'
		const quiet = args.quiet || isCI || json

		const preflight = await runPreflight(cwd)
		if (!preflight.valid) {
			if (json) {
				console.log(JSON.stringify({ ok: false, errors: preflight.errors }))
				process.exit(1)
			}

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
		if (!quiet) s.start('Running diagnostics...')

		const [installChecks, conflictChecks] = await Promise.all([
			runToolInstallationChecks(cwd),
			runConflictChecks(cwd),
		])
		const diagnostics = [...installChecks, ...conflictChecks]

		if (!quiet) s.stop('Diagnostics complete')

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
