export function resolveCwd(args: {
	cwd?: string | boolean
	_?: (string | number)[]
}): string {
	if (typeof args.cwd === 'string') return args.cwd
	if (
		Array.isArray(args._) &&
		args._.length > 0 &&
		typeof args._[0] === 'string'
	) {
		return args._[0]
	}
	return process.cwd()
}
