import type { DiagnosticCheck, Task, TaskStatus } from '@xtarterize/core'

/**
 * Format non-conformant tasks and failing diagnostics as GitHub Actions
 * workflow command annotations.
 *
 * https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/troubleshooting-workflow-commands
 */
export function formatCheckAnnotations(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	diagnostics: DiagnosticCheck[],
): string {
	const lines: string[] = []

	for (const task of tasks) {
		const status = statuses.get(task.id) ?? 'new'
		if (status === 'skip') continue

		const file = task.searchMeta?.configTargets?.[0]
		const props = [
			file ? `file=${escapeProperty(file)}` : '',
			`title=${escapeProperty(task.label)}`,
		]
			.filter(Boolean)
			.join(',')

		lines.push(`::error ${props}::${escapeData(`${task.id} is ${status}`)}`)
	}

	for (const diagnostic of diagnostics) {
		if (diagnostic.status === 'pass') continue
		const level = diagnostic.status === 'fail' ? 'error' : 'warning'
		lines.push(
			`::${level} title=${escapeProperty(diagnostic.name)}::${escapeData(diagnostic.message)}`,
		)
	}

	return lines.join('\n')
}

/** Escape a workflow command property value (file, title). */
function escapeProperty(value: string): string {
	return value
		.replaceAll('%', '%25')
		.replaceAll('\r', '%0D')
		.replaceAll('\n', '%0A')
		.replaceAll(':', '%3A')
		.replaceAll(',', '%2C')
}

/** Escape workflow command message data. */
function escapeData(value: string): string {
	return value
		.replaceAll('%', '%25')
		.replaceAll('\r', '%0D')
		.replaceAll('\n', '%0A')
}
