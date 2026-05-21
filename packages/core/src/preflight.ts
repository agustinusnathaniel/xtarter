import { Effect } from 'effect'
import { FileSystemError } from '@/errors.js'
import { fileExists, resolvePath } from '@/utils/fs.js'
import { readPackageJson } from '@/utils/pkg.js'

export interface PreflightError {
	code: string
	message: string
	hint?: string
}

export interface PreflightResult {
	valid: boolean
	errors: PreflightError[]
}

function tryEffect<A>(f: () => Promise<A>): Effect.Effect<A, FileSystemError> {
	return Effect.tryPromise({
		try: (_signal) => f(),
		catch: (cause) => new FileSystemError({ path: 'unknown', cause }),
	})
}

export function runPreflight(cwd: string): Promise<PreflightResult> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const errors: PreflightError[] = []

			const hasPackageJson = yield* tryEffect(() =>
				fileExists(resolvePath(cwd, 'package.json')),
			)
			if (!hasPackageJson) {
				errors.push({
					code: 'MISSING_PACKAGE_JSON',
					message: 'No package.json found',
					hint: 'Run xtarterize init from the root of a JS/TS project.',
				})
				return { valid: false, errors }
			}

			const pkg = yield* Effect.orElseSucceed(
				tryEffect(() => readPackageJson(cwd)),
				() => null as Awaited<ReturnType<typeof readPackageJson>>,
			)
			if (!pkg?.name) {
				errors.push({
					code: 'INVALID_PACKAGE_JSON',
					message: 'package.json is missing a "name" field',
					hint: 'Add a "name" field to your package.json and try again.',
				})
				return { valid: false, errors }
			}

			const hasGit = yield* tryEffect(() =>
				fileExists(resolvePath(cwd, '.git')),
			)
			if (!hasGit) {
				errors.push({
					code: 'MISSING_GIT',
					message: 'No .git directory found',
					hint: 'Initialize a git repository with "git init" before running xtarterize.',
				})
			}

			return { valid: errors.length === 0, errors }
		}),
	)
}
