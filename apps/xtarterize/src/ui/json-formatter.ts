import type {
	DiagnosticCheck,
	InquiryResult,
	ProjectProfile,
	ResolveTiming,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import { formatTimingJson } from '@/utils/timing-display.js'

export interface TaskJson {
	id: string
	label: string
	group: string
	status: TaskStatus
}

export function formatTaskList(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
): TaskJson[] {
	return tasks.map((task) => ({
		id: task.id,
		label: task.label,
		group: task.group,
		status: statuses.get(task.id) ?? 'new',
	}))
}

interface CheckResultOptions {
	tasks: Task[]
	statuses: Map<string, TaskStatus>
	diagnostics: DiagnosticCheck[]
	timing?: ResolveTiming
}

export function formatCheckResult(options: CheckResultOptions): string {
	const { tasks, statuses, diagnostics, timing } = options
	const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length
	const hasFailures = diagnostics.some((d) => d.status === 'fail')
	const result: Record<string, unknown> = {
		ok: !hasFailures && conformant === tasks.length,
		summary: { conformant, total: tasks.length },
		tasks: formatTaskList(tasks, statuses),
		diagnostics,
	}
	if (timing) result.timing = timing
	return JSON.stringify(result)
}

interface ListResultOptions {
	profile: ProjectProfile
	tasks: Task[]
	statuses: Map<string, TaskStatus>
	timing?: ResolveTiming
}

export function formatListResult(options: ListResultOptions): string {
	const { profile, tasks, statuses, timing } = options
	const result: Record<string, unknown> = {
		ok: true,
		profile: {
			framework: profile.framework,
			bundler: profile.bundler,
			packageManager: profile.packageManager,
			typescript: profile.typescript,
		},
		tasks: formatTaskList(tasks, statuses),
	}
	if (timing) result.timing = timing
	return JSON.stringify(result)
}

interface QueryResultOptions {
	results: InquiryResult[]
	query: string
	timing: ResolveTiming
}

export function formatQueryResult(options: QueryResultOptions): string {
	const { results, query, timing } = options
	return JSON.stringify(
		{
			type: 'query',
			query,
			count: results.length,
			results: results.map((r) => ({
				taskId: r.taskId,
				label: r.task.label,
				group: r.task.group,
				relevance: r.relevance,
				signals: r.signals,
			})),
			timing: formatTimingJson(timing),
		},
		null,
		2,
	)
}

export function formatDoctorResult(diagnostics: DiagnosticCheck[]): string {
	const summary = {
		pass: diagnostics.filter((d) => d.status === 'pass').length,
		warn: diagnostics.filter((d) => d.status === 'warn').length,
		fail: diagnostics.filter((d) => d.status === 'fail').length,
		total: diagnostics.length,
	}
	return JSON.stringify({ ok: summary.fail === 0, summary, diagnostics })
}
