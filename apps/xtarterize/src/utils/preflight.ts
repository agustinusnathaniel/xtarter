import type { PreflightResult } from '@xtarterize/core'
import { pc } from '@xtarterize/core'

export function handlePreflightFailure(
	preflight: PreflightResult,
	json: boolean,
): void {
	if (preflight.valid) return

	if (json) {
		console.log(
			JSON.stringify({
				ok: false,
				errors: preflight.errors,
			}),
		)
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
