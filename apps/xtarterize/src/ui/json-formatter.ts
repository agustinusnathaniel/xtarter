import type {
	DiagnosticCheck,
	ProjectProfile,
	ResolveTiming,
	Task,
	TaskStatus,
} from '@xtarterize/core'

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

export function formatCheckResult(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	diagnostics: DiagnosticCheck[],
	timing?: ResolveTiming,
): string {
	const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length
	const result: Record<string, unknown> = {
		ok: true,
		summary: { conformant, total: tasks.length },
		tasks: formatTaskList(tasks, statuses),
		diagnostics,
	}
	if (timing) result.timing = timing
	return JSON.stringify(result)
}

export function formatListResult(
	profile: ProjectProfile,
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	timing?: ResolveTiming,
): string {
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

export function formatDoctorResult(diagnostics: DiagnosticCheck[]): string {
	const summary = {
		pass: diagnostics.filter((d) => d.status === 'pass').length,
		warn: diagnostics.filter((d) => d.status === 'warn').length,
		fail: diagnostics.filter((d) => d.status === 'fail').length,
		total: diagnostics.length,
	}
	return JSON.stringify({ ok: true, summary, diagnostics })
}
