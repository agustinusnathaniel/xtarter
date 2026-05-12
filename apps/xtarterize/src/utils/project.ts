import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core'
import {
	createSpinner,
	detectProject,
	resolveTaskStatuses,
	resolveTasks,
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
}

export function resolveCliContext(args: {
	quiet?: boolean | string | number | string[]
	json?: boolean | string | number | string[]
	format?: string
	cwd?: string | boolean
	_?: (string | number)[]
}): CliContext {
	const cwd = resolveCwd(args)
	const { json, quiet, format } = resolveRuntimeFlags(args)
	return { cwd, json, quiet, format }
}

export interface ScanResult {
	profile: ProjectProfile
	tasks: Task[]
	statuses: Map<string, TaskStatus>
}

export async function scanProject(ctx: CliContext): Promise<ScanResult> {
	const preflight = await runPreflight(ctx.cwd)
	handlePreflightFailure(preflight, ctx.json)

	const s = createSpinner(ctx.quiet)
	s.start('Scanning project...')

	const profile = await detectProject(ctx.cwd)
	s.stop('Project scanned')

	const allTasks = getAllTasks()
	const tasks = resolveTasks(profile, allTasks)
	const statuses = await resolveTaskStatuses(tasks, ctx.cwd, profile)

	return { profile, tasks, statuses }
}
