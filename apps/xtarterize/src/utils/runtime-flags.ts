export function resolveRuntimeFlags(args: {
	quiet?: boolean | string | number | string[]
	json?: boolean | string | number | string[]
}): { json: boolean; isCI: boolean; quiet: boolean } {
	const json = args.json === true
	const isCI = process.env.CI === 'true' || process.env.CI === '1'
	const quiet = args.quiet === true || isCI || json
	return { json, isCI, quiet }
}
