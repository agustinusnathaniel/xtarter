import { x } from 'tinyexec'
import { fileExists, resolvePath } from '@/utils/fs.js'
import { readPackageJson } from '@/utils/pkg.js'

export interface DiagnosticCheck {
	name: string
	status: 'pass' | 'warn' | 'fail'
	message: string
}

export async function getToolVersion(
	tool: string,
	cwd: string,
): Promise<string | null> {
	try {
		const result = await x(tool, ['--version'], { nodeOptions: { cwd } })
		if (result.exitCode === 0) {
			return result.stdout.trim().split('\n')[0] || null
		}
		return null
	} catch {
		return null
	}
}

export async function checkToolInstalled(
	tool: string,
	cwd: string,
): Promise<boolean> {
	const version = await getToolVersion(tool, cwd)
	return version !== null
}

export async function runEnvironmentChecks(
	cwd: string,
): Promise<DiagnosticCheck[]> {
	const checks: DiagnosticCheck[] = []
	const pkg = await readPackageJson(cwd)

	const nodeVersion = process.version
	const engineNode = pkg?.engines?.node
	let nodeSatisfies = true

	if (engineNode) {
		const nodeMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10)
		const cleanRange = engineNode.replace(/[>=<^~ ]/g, '').split('.')[0]
		const engineMajor = Number.parseInt(cleanRange, 10)
		if (!Number.isNaN(engineMajor)) {
			nodeSatisfies = nodeMajor >= engineMajor
		}
	}

	checks.push({
		name: 'Node.js',
		status: nodeSatisfies ? 'pass' : 'warn',
		message: engineNode
			? `Node.js ${nodeVersion} (required: ${engineNode})`
			: `Node.js ${nodeVersion}`,
	})

	const gitVersion = await getToolVersion('git', cwd)
	checks.push({
		name: 'Git',
		status: gitVersion ? 'pass' : 'fail',
		message: gitVersion
			? `Git ${gitVersion}`
			: 'Git is not installed (required by xtarterize)',
	})

	return checks
}

export async function runProjectHealthChecks(
	cwd: string,
): Promise<DiagnosticCheck[]> {
	const checks: DiagnosticCheck[] = []
	const pkg = await readPackageJson(cwd)
	if (!pkg) return checks

	const deps = { ...pkg.dependencies, ...pkg.devDependencies }

	const lockfiles = [
		['pnpm-lock.yaml', 'pnpm'],
		['package-lock.json', 'npm'],
		['yarn.lock', 'yarn'],
		['bun.lock', 'bun'],
		['bun.lockb', 'bun'],
	] as const

	const lockfileDetected = (
		await Promise.all(
			lockfiles.map(([file]) => fileExists(resolvePath(cwd, file))),
		)
	).some(Boolean)

	checks.push({
		name: 'Lockfile',
		status: lockfileDetected ? 'pass' : 'warn',
		message: lockfileDetected
			? 'Lockfile found — dependencies are locked'
			: 'No lockfile found — dependencies may not be reproducible',
	})

	if (deps.typescript) {
		const hasTsconfig = await fileExists(resolvePath(cwd, 'tsconfig.json'))
		checks.push({
			name: 'TypeScript config',
			status: hasTsconfig ? 'pass' : 'warn',
			message: hasTsconfig
				? 'TypeScript config found (tsconfig.json)'
				: 'TypeScript is a dependency but tsconfig.json is missing',
		})
	}

	const hasReadme = await fileExists(resolvePath(cwd, 'README.md'))
	checks.push({
		name: 'README',
		status: hasReadme ? 'pass' : 'warn',
		message: hasReadme
			? 'README.md found'
			: 'No README.md — consider adding one',
	})

	const hasGitignore = await fileExists(resolvePath(cwd, '.gitignore'))
	checks.push({
		name: '.gitignore',
		status: hasGitignore ? 'pass' : 'warn',
		message: hasGitignore
			? '.gitignore found'
			: 'No .gitignore — generated files may be tracked',
	})

	return checks
}

export async function runConflictChecks(
	cwd: string,
): Promise<DiagnosticCheck[]> {
	const checks: DiagnosticCheck[] = []
	const pkg = await readPackageJson(cwd)
	if (!pkg) return checks

	const deps = { ...pkg.dependencies, ...pkg.devDependencies }

	const hasBiome = !!deps['@biomejs/biome']
	const hasEslint = !!deps.eslint
	const hasPrettier = !!deps.prettier

	if (hasBiome && hasEslint) {
		checks.push({
			name: 'Conflicting tools',
			status: 'warn',
			message:
				'Both Biome and ESLint are configured. Consider using one as primary.',
		})
	}

	if (hasBiome && hasPrettier) {
		checks.push({
			name: 'Conflicting tools',
			status: 'warn',
			message:
				'Both Biome and Prettier are configured. Biome includes formatting — Prettier may be redundant.',
		})
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
		if (await fileExists(resolvePath(cwd, config))) {
			checks.push({
				name: 'Legacy config',
				status: 'warn',
				message: `Legacy ESLint config found (${config}). Consider migrating to flat config (eslint.config.js).`,
			})
			break
		}
	}

	if (checks.length === 0) {
		checks.push({
			name: 'Conflicting tools',
			status: 'pass',
			message: 'No conflicting formatting/linting tools detected.',
		})
	}

	return checks
}

export async function runToolInstallationChecks(
	cwd: string,
): Promise<DiagnosticCheck[]> {
	const checks: DiagnosticCheck[] = []
	const pkg = await readPackageJson(cwd)
	if (!pkg) return checks

	const deps = { ...pkg.dependencies, ...pkg.devDependencies }

	const toolsToCheck: {
		name: string
		dep: string
		cmd: string
	}[] = [
		{ name: 'Biome', dep: '@biomejs/biome', cmd: 'biome' },
		{ name: 'ESLint', dep: 'eslint', cmd: 'eslint' },
		{ name: 'TypeScript', dep: 'typescript', cmd: 'tsc' },
		{ name: 'Commitlint', dep: '@commitlint/cli', cmd: 'commitlint' },
		{ name: 'Knip', dep: 'knip', cmd: 'knip' },
	]

	for (const tool of toolsToCheck) {
		if (deps[tool.dep]) {
			const version = await getToolVersion(tool.cmd, cwd)
			checks.push({
				name: `${tool.name} installation`,
				status: version ? 'pass' : 'warn',
				message: version
					? `${tool.name} ${version} is installed`
					: `${tool.name} is in package.json but not installed (run \`pnpm install\`)`,
			})
		}
	}

	return checks
}
