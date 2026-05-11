import { isCI } from '@xtarterize/core'

export function resolveRuntimeFlags(args: {
	quiet?: boolean | string | number | string[]
	json?: boolean | string | number | string[]
}): { json: boolean; isCI: boolean; quiet: boolean } {
	const json = args.json === true
	const ci = isCI()
	const quiet = args.quiet === true || ci || json
	return { json, isCI: ci, quiet }
}
