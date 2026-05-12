import { isCI } from '@xtarterize/core'
import type { DisplayFormat } from '@/ui/diff-display.js'

export function resolveRuntimeFlags(args: {
	quiet?: boolean | string | number | string[]
	json?: boolean | string | number | string[]
	format?: string
}): { json: boolean; isCI: boolean; quiet: boolean; format: DisplayFormat } {
	const json = args.json === true
	const ci = isCI()
	const format = resolveFormat(args.format, json)
	const quiet = args.quiet === true || ci || json
	return { json, isCI: ci, quiet, format }
}

function resolveFormat(
	formatArg: string | undefined,
	jsonFlag: boolean,
): DisplayFormat {
	if (formatArg === 'json' || jsonFlag) return 'json'
	return 'terminal'
}
