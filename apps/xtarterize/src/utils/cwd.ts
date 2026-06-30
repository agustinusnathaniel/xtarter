export function resolveCwd(args: {
	cwd?: string | boolean
	_?: (string | number)[]
}): string {
	if (typeof args.cwd === 'string') return args.cwd
	return process.cwd()
}
