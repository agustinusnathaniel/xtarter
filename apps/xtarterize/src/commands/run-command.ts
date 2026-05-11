import { select } from '@clack/prompts'
import type { FileDiff, TaskStatus } from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	createSpinner,
	detectProject,
	isCI,
	logError,
	logInfo,
	logSuccess,
	pc,
	readPackageJson,
	resolveTaskStatuses,
	resolveTasks,
	runPreflight,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { displayDiffs } from '@/ui/diff-display.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { displayPlan } from '@/ui/plan-display.js'
import { selectTasks } from '@/ui/select-menu.js'
import { handlePreflightFailure } from '@/utils/preflight.js'

interface CommandArgs {
	dryRun?: boolean
	yes?: boolean
	skip?: string
	only?: string
	quiet?: boolean
	includeConflicts?: boolean
}

interface RunCommandOptions {
	actionableStatuses: TaskStatus[]
	emptyMessage: string
	confirmMessage: string
}

async function applyAndReport(
	tasks: ReturnType<typeof resolveTasks>,
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProject>>,
	selectedIds?: string[],
	includeConflicts?: boolean,
): Promise<void> {
	const result = await applyTasks(tasks, cwd, profile, selectedIds, {
		includeConflicts,
	})
	console.log('')
	logSuccess(`Applied ${result.applied} tasks`)
	if (result.errors.length > 0) {
		logError(`${result.errors.length} errors`)
		for (const error of result.errors) {
			logError(`  - ${error}`)
		}
	}
}

async function runPreflightAndDetect(
	cwd: string,
	args: CommandArgs,
): Promise<{
	profile: Awaited<ReturnType<typeof detectProject>>
	quiet: boolean
}> {
	const ci = isCI()
	const quiet = args.quiet || ci

	const preflight = await runPreflight(cwd)
	if (!preflight.valid) {
		handlePreflightFailure(preflight, false)
	}

	const s = createSpinner(quiet)
	s.start('Scanning project...')

	let profile = await detectProject(cwd)

	if (profile.framework === null) {
		s.stop()
		const pkg = await readPackageJson(cwd)
		const allDeps: Record<string, string> = {}
		if (pkg?.dependencies) Object.assign(allDeps, pkg.dependencies)
		if (pkg?.devDependencies) Object.assign(allDeps, pkg.devDependencies)

		const hasReactNative = !!(allDeps['react-native'] || allDeps.expo)
		const hasReact = !!allDeps.react

		if (hasReactNative && hasReact) {
			if (quiet) {
				profile = { ...profile, framework: 'react' }
			} else {
				const resolved = await resolveAmbiguousFramework()
				profile = { ...profile, framework: resolved }
			}
		}
	} else {
		s.stop('Project scanned')
	}

	if (!quiet) {
		console.log('')
		console.log(`${pc.bold(`Framework: ${profile.framework ?? 'none'}`)}`)
		console.log(`${pc.bold(`Bundler: ${profile.bundler ?? 'none'}`)}`)
		console.log(`${pc.bold(`Package Manager: ${profile.packageManager}`)}`)
		console.log('')
	}

	return { profile, quiet }
}

function resolveActionableTasks(
	tasks: ReturnType<typeof resolveTasks>,
	statuses: Map<string, TaskStatus>,
	options: RunCommandOptions,
	args: CommandArgs,
): ReturnType<typeof resolveTasks> {
	let filteredTasks = tasks

	if (args.skip) {
		const skipIds = args.skip.split(',').map((s) => s.trim())
		filteredTasks = filteredTasks.filter((t) => !skipIds.includes(t.id))
	}

	if (args.only) {
		const onlyIds = args.only.split(',').map((s) => s.trim())
		filteredTasks = filteredTasks.filter((t) => onlyIds.includes(t.id))
	}

	return filteredTasks.filter((t) => {
		const status = statuses.get(t.id)
		return status !== undefined && options.actionableStatuses.includes(status)
	})
}

async function handleDryRun(
	tasks: ReturnType<typeof resolveTasks>,
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProject>>,
): Promise<void> {
	const diffs: FileDiff[] = []
	for (const task of tasks) {
		const taskDiffs = await task.dryRun(cwd, profile)
		diffs.push(...taskDiffs)
	}
	displayDiffs(mergeFileDiffs(diffs))
}

async function promptAndApply(
	actionableTasks: ReturnType<typeof resolveTasks>,
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProject>>,
	statuses: Map<string, TaskStatus>,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const action = await select({
		message: options.confirmMessage,
		options: [
			{ value: 'apply-all', label: 'Apply all' },
			{ value: 'select', label: 'Select tasks' },
			{ value: 'dry-run', label: 'Dry run' },
			{ value: 'quit', label: 'Quit' },
		],
	})

	abortIfCancelled(action)

	if (action === 'quit') {
		logInfo('Cancelled')
		return
	}

	if (action === 'dry-run') {
		await handleDryRun(actionableTasks, cwd, profile)
		return
	}

	if (action === 'select') {
		const selected = await selectTasks(actionableTasks, statuses)
		if (selected.length === 0) {
			logInfo('No tasks selected')
			return
		}

		await applyAndReport(
			actionableTasks,
			cwd,
			profile,
			selected,
			args.includeConflicts,
		)
		return
	}

	const selectedIds = actionableTasks.map((task) => task.id)
	await applyAndReport(
		actionableTasks,
		cwd,
		profile,
		selectedIds,
		args.includeConflicts,
	)
}

export async function runCommand(
	cwd: string,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const { profile, quiet } = await runPreflightAndDetect(cwd, args)

	const allTasks = getAllTasks()
	const tasks = resolveTasks(profile, allTasks)

	const statuses = await resolveTaskStatuses(tasks, cwd, profile)
	const actionableTasks = resolveActionableTasks(tasks, statuses, options, args)

	if (actionableTasks.length === 0) {
		logSuccess(options.emptyMessage)
		return
	}

	if (!quiet) displayPlan(actionableTasks, statuses)

	if (args.dryRun) {
		await handleDryRun(actionableTasks, cwd, profile)
		return
	}

	if (args.yes || quiet) {
		await applyAndReport(actionableTasks, cwd, profile)
		return
	}

	await promptAndApply(actionableTasks, cwd, profile, statuses, args, options)
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

export const sharedRunArgs = {
	dryRun: {
		type: 'boolean',
		description: 'Preview changes without applying',
	},
	yes: {
		type: 'boolean',
		description: 'Skip all confirmations, apply all',
	},
	skip: {
		type: 'string',
		description: 'Exclude a specific task (comma-separated)',
	},
	only: {
		type: 'string',
		description: 'Apply only a specific task',
	},
	quiet: {
		type: 'boolean',
		description: 'Suppress interactive prompts and verbose output',
	},
	includeConflicts: {
		type: 'boolean',
		description: 'Include conflicting tasks when applying (default: false)',
	},
} as const
