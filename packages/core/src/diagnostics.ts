import { Effect } from 'effect'
import { x } from 'tinyexec'
import { FileSystemError } from '@/errors.js'
import { fileExists, resolvePath } from '@/utils/fs.js'
import { readPackageJson } from '@/utils/pkg.js'

export interface DiagnosticCheck {
	name: string
	status: 'pass' | 'warn' | 'fail'
	message: string
}

function makeCheck(
	name: string,
	status: 'pass' | 'warn' | 'fail',
	message: string,
): DiagnosticCheck {
	return { name, status, message }
}

function tryEffect<A>(f: () => Promise<A>): Effect.Effect<A, FileSystemError> {
	return Effect.tryPromise({
		try: (_signal) => f(),
		catch: (cause) => new FileSystemError({ path: 'unknown', cause }),
	})
}

function runTool(
	tool: string,
	cwd: string,
): Effect.Effect<string | null, FileSystemError> {
	return Effect.orElseSucceed(
		Effect.tryPromise({
			try: async (_signal) => {
				const result = await x(tool, ['--version'], { nodeOptions: { cwd } })
				if (result.exitCode === 0) {
					return result.stdout.trim().split('\n')[0] || null
				}
				return null
			},
			catch: (cause) => new FileSystemError({ path: tool, cause }),
		}),
		() => null,
	)
}

export function getToolVersion(
	tool: string,
	cwd: string,
): Promise<string | null> {
	return Effect.runPromise(runTool(tool, cwd))
}

export function checkToolInstalled(
	tool: string,
	cwd: string,
): Promise<boolean> {
	return Effect.runPromise(
		runTool(tool, cwd).pipe(Effect.map((v) => v !== null)),
	)
}

export function runEnvironmentChecks(cwd: string): Promise<DiagnosticCheck[]> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const pkg = yield* Effect.orElseSucceed(
				tryEffect(() => readPackageJson(cwd)),
				() => null as Awaited<ReturnType<typeof readPackageJson>>,
			)

			const nodeVersion = process.version
			const engineNode = pkg?.engines?.node
			let nodeSatisfies = true

			if (engineNode) {
				const nodeMajor = Number.parseInt(
					nodeVersion.slice(1).split('.')[0],
					10,
				)
				const cleanRange = engineNode.replace(/[>=<^~ ]/g, '').split('.')[0]
				const engineMajor = Number.parseInt(cleanRange, 10)
				if (!Number.isNaN(engineMajor)) {
					nodeSatisfies = nodeMajor >= engineMajor
				}
			}

			const gitVersion = yield* runTool('git', cwd)

			return [
				makeCheck(
					'Node.js',
					nodeSatisfies ? 'pass' : 'warn',
					engineNode
						? `Node.js ${nodeVersion} (required: ${engineNode})`
						: `Node.js ${nodeVersion}`,
				),
				makeCheck(
					'Git',
					gitVersion ? 'pass' : 'fail',
					gitVersion
						? `Git ${gitVersion}`
						: 'Git is not installed (required by xtarterize)',
				),
			]
		}),
	)
}

function lockfileEntries(): Array<readonly [string, string]> {
	return [
		['pnpm-lock.yaml', 'pnpm'],
		['package-lock.json', 'npm'],
		['yarn.lock', 'yarn'],
		['bun.lock', 'bun'],
		['bun.lockb', 'bun'],
	]
}

export function runProjectHealthChecks(
	cwd: string,
): Promise<DiagnosticCheck[]> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const pkg = yield* Effect.orElseSucceed(
				tryEffect(() => readPackageJson(cwd)),
				() => null as Awaited<ReturnType<typeof readPackageJson>>,
			)
			if (!pkg) return [] as DiagnosticCheck[]

			const deps = { ...pkg.dependencies, ...pkg.devDependencies }
			const checks: DiagnosticCheck[] = []

			const lockfileResults = yield* Effect.all(
				lockfileEntries().map(([file]) =>
					tryEffect(() => fileExists(resolvePath(cwd, file))),
				),
			)
			const lockfileDetected = lockfileResults.some(Boolean)

			checks.push(
				makeCheck(
					'Lockfile',
					lockfileDetected ? 'pass' : 'warn',
					lockfileDetected
						? 'Lockfile found — dependencies are locked'
						: 'No lockfile found — dependencies may not be reproducible',
				),
			)

			if (deps.typescript) {
				const hasTsconfig = yield* tryEffect(() =>
					fileExists(resolvePath(cwd, 'tsconfig.json')),
				)
				checks.push(
					makeCheck(
						'TypeScript config',
						hasTsconfig ? 'pass' : 'warn',
						hasTsconfig
							? 'TypeScript config found (tsconfig.json)'
							: 'TypeScript is a dependency but tsconfig.json is missing',
					),
				)
			}

			const hasReadme = yield* tryEffect(() =>
				fileExists(resolvePath(cwd, 'README.md')),
			)
			checks.push(
				makeCheck(
					'README',
					hasReadme ? 'pass' : 'warn',
					hasReadme ? 'README.md found' : 'No README.md — consider adding one',
				),
			)

			const hasGitignore = yield* tryEffect(() =>
				fileExists(resolvePath(cwd, '.gitignore')),
			)
			checks.push(
				makeCheck(
					'.gitignore',
					hasGitignore ? 'pass' : 'warn',
					hasGitignore
						? '.gitignore found'
						: 'No .gitignore — generated files may be tracked',
				),
			)

			return checks
		}),
	)
}

export function runConflictChecks(cwd: string): Promise<DiagnosticCheck[]> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const pkg = yield* Effect.orElseSucceed(
				tryEffect(() => readPackageJson(cwd)),
				() => null as Awaited<ReturnType<typeof readPackageJson>>,
			)
			if (!pkg) return [] as DiagnosticCheck[]

			const deps = { ...pkg.dependencies, ...pkg.devDependencies }
			const checks: DiagnosticCheck[] = []

			const hasBiome = !!deps['@biomejs/biome']
			const hasEslint = !!deps.eslint
			const hasPrettier = !!deps.prettier

			if (hasBiome && hasEslint) {
				checks.push(
					makeCheck(
						'Conflicting tools',
						'warn',
						'Both Biome and ESLint are configured. Consider using one as primary.',
					),
				)
			}

			if (hasBiome && hasPrettier) {
				checks.push(
					makeCheck(
						'Conflicting tools',
						'warn',
						'Both Biome and Prettier are configured. Biome includes formatting — Prettier may be redundant.',
					),
				)
			}

			const legacyEslintConfigs = [
				'.eslintrc',
				'.eslintrc.js',
				'.eslintrc.cjs',
				'.eslintrc.mjs',
				'.eslintrc.json',
				'.eslintrc.yaml',
				'.eslintrc.yml',
			]
			for (const config of legacyEslintConfigs) {
				if (yield* tryEffect(() => fileExists(resolvePath(cwd, config)))) {
					checks.push(
						makeCheck(
							'Legacy config',
							'warn',
							`Legacy ESLint config found (${config}). Consider migrating to flat config (eslint.config.js).`,
						),
					)
					break
				}
			}

			if (checks.length === 0) {
				checks.push(
					makeCheck(
						'Conflicting tools',
						'pass',
						'No conflicting formatting/linting tools detected.',
					),
				)
			}

			return checks
		}),
	)
}

export function runToolInstallationChecks(
	cwd: string,
): Promise<DiagnosticCheck[]> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const pkg = yield* Effect.orElseSucceed(
				tryEffect(() => readPackageJson(cwd)),
				() => null as Awaited<ReturnType<typeof readPackageJson>>,
			)
			if (!pkg) return [] as DiagnosticCheck[]

			const deps = { ...pkg.dependencies, ...pkg.devDependencies }
			const checks: DiagnosticCheck[] = []

			const toolsToCheck: { name: string; dep: string; cmd: string }[] = [
				{ name: 'Biome', dep: '@biomejs/biome', cmd: 'biome' },
				{ name: 'ESLint', dep: 'eslint', cmd: 'eslint' },
				{ name: 'TypeScript', dep: 'typescript', cmd: 'tsc' },
				{ name: 'Commitlint', dep: '@commitlint/cli', cmd: 'commitlint' },
				{ name: 'Knip', dep: 'knip', cmd: 'knip' },
			]

			for (const tool of toolsToCheck) {
				if (deps[tool.dep]) {
					const version = yield* runTool(tool.cmd, cwd)
					checks.push(
						makeCheck(
							`${tool.name} installation`,
							version ? 'pass' : 'warn',
							version
								? `${tool.name} ${version} is installed`
								: `${tool.name} is in package.json but not installed (run \`pnpm install\`)`,
						),
					)
				}
			}

			return checks
		}),
	)
}
