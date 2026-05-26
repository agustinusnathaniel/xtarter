import { select } from '@clack/prompts'
import type {
	ProjectProfile,
	ResolveTiming,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import {
	abortIfCancelled,
	createSpinner,
	detectProject,
	pc,
	readPackageJson,
	resolveProjectTasks,
	runPreflight,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import type { DisplayFormat } from '@/ui/diff-display.js'
import { resolveCwd } from './cwd.js'
import { handlePreflightFailure } from './preflight.js'
import { resolveRuntimeFlags } from './runtime-flags.js'

export interface CliContext {
	cwd: string
	json: boolean
	quiet: boolean
	format: DisplayFormat
	timing: boolean
}

export function resolveCliContext(args: {
	quiet?: boolean | string | number | string[]
	json?: boolean | string | number | string[]
	format?: string
	cwd?: string | boolean
	timing?: boolean
	_?: (string | number)[]
}): CliContext {
	const cwd = resolveCwd(args)
	const { json, quiet, format } = resolveRuntimeFlags(args)
	return { cwd, json, quiet, format, timing: args.timing === true }
}

export interface ScanResult {
	profile: ProjectProfile
	tasks: Task[]
	statuses: Map<string, TaskStatus>
	timing: ResolveTiming
}

export async function scanProject(ctx: CliContext): Promise<ScanResult> {
	const preflight = await runPreflight(ctx.cwd)
	handlePreflightFailure(preflight, ctx.json)

	const s = createSpinner(ctx.quiet)
	s.start('Scanning project...')

	const allTasks = getAllTasks()
	const result = await resolveProjectTasks(ctx.cwd, allTasks)

	s.stop('Project scanned')
	return result
}

export async function detectProjectWithAmbiguity(
	cwd: string,
	quiet: boolean,
	baseProfile?: ProjectProfile,
): Promise<ProjectProfile> {
	let profile = baseProfile ?? (await detectProject(cwd))

	if (profile.framework === null && !quiet) {
		const pkg = await readPackageJson(cwd)
		const allDeps: Record<string, string> = {}
		if (pkg?.dependencies) Object.assign(allDeps, pkg.dependencies)
		if (pkg?.devDependencies) Object.assign(allDeps, pkg.devDependencies)

		const hasReactNative = !!(allDeps['react-native'] || allDeps.expo)
		const hasReact = !!allDeps.react

		if (hasReactNative && hasReact) {
			const resolved = await resolveAmbiguousFramework()
			profile = { ...profile, framework: resolved }
		}
	}

	return profile
}

export function printProjectProfile(profile: ProjectProfile): void {
	console.log('')
	console.log(`${pc.bold(`Framework: ${profile.framework ?? 'none'}`)}`)
	console.log(`${pc.bold(`Bundler: ${profile.bundler ?? 'none'}`)}`)
	console.log(`${pc.bold(`Package Manager: ${profile.packageManager}`)}`)
	console.log('')
}

async function resolveAmbiguousFramework(): Promise<
	'react' | 'react-native' | 'node'
> {
	const choice = await select({
		message:
			'Detected both React and React Native dependencies. Which best describes this project?',
		options: [
			{ value: 'react', label: 'React (web)' },
			{ value: 'react-native', label: 'React Native / Expo (mobile)' },
			{ value: 'node', label: 'Universal (web + native, treating as Node)' },
		],
	})

	abortIfCancelled(choice)

	return choice as 'react' | 'react-native' | 'node'
}
