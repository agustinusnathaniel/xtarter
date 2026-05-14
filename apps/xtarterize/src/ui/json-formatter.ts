import type {
	DiagnosticCheck,
	ProjectProfile,
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
): string {
	const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length
	return JSON.stringify({
		ok: true,
		summary: { conformant, total: tasks.length },
		tasks: formatTaskList(tasks, statuses),
		diagnostics,
	})
}

export function formatListResult(
	profile: ProjectProfile,
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
): string {
	return JSON.stringify({
		ok: true,
		profile: {
			framework: profile.framework,
			bundler: profile.bundler,
			packageManager: profile.packageManager,
			typescript: profile.typescript,
		},
		tasks: formatTaskList(tasks, statuses),
	})
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
