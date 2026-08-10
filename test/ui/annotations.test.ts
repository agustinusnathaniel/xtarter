import type { DiagnosticCheck, Task, TaskStatus } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'
import { formatCheckAnnotations } from '../../apps/xtarterize/src/ui/annotations.js'

function makeTask(id: string, label: string, configTargets?: string[]): Task {
	return {
		id,
		label,
		group: 'test',
		searchMeta: configTargets
			? { tags: [], configTargets, keywords: [] }
			: undefined,
		applicable: () => true,
		check: async () => 'skip' as const,
		dryRun: async () => [],
		apply: async () => {},
	}
}

function makeStatuses(
	entries: Array<[string, TaskStatus]>,
): Map<string, TaskStatus> {
	return new Map(entries)
}

describe('formatCheckAnnotations', () => {
	it('emits error annotation per non-conformant task with file target', () => {
		const tasks = [
			makeTask('ts/strict', 'Strict TypeScript', ['tsconfig.json']),
		]
		const statuses = makeStatuses([['ts/strict', 'patch']])

		const output = formatCheckAnnotations(tasks, statuses, [])

		expect(output).toContain(
			'::error file=tsconfig.json,title=Strict TypeScript::ts/strict is patch',
		)
	})

	it('omits conformant tasks', () => {
		const tasks = [
			makeTask('ts/strict', 'Strict TypeScript', ['tsconfig.json']),
		]
		const statuses = makeStatuses([['ts/strict', 'skip']])

		const output = formatCheckAnnotations(tasks, statuses, [])

		expect(output).not.toContain('ts/strict')
		expect(formatCheckAnnotations([], new Map(), [])).toBe('')
	})

	it('uses configTargets[0] as file', () => {
		const tasks = [
			makeTask('ts/strict', 'Strict TypeScript', [
				'tsconfig.json',
				'package.json',
			]),
		]
		const statuses = makeStatuses([['ts/strict', 'new']])

		const output = formatCheckAnnotations(tasks, statuses, [])

		expect(output).toContain('file=tsconfig.json')
		expect(output).not.toContain('package.json')
	})

	it('omits file when no configTargets', () => {
		const tasks = [makeTask('ts/strict', 'Strict TypeScript')]
		const statuses = makeStatuses([['ts/strict', 'patch']])

		const output = formatCheckAnnotations(tasks, statuses, [])

		expect(output).toMatch(/^::error title=Strict TypeScript::/)
	})

	it('maps fail diagnostic to error and warn to warning', () => {
		const diagnostics: DiagnosticCheck[] = [
			{ name: 'Conflict', status: 'fail', message: 'Biome + ESLint' },
			{ name: 'Tools', status: 'warn', message: 'missing' },
			{ name: 'Passing', status: 'pass', message: 'ok' },
		]

		const output = formatCheckAnnotations([], new Map(), diagnostics)

		expect(output).toContain('::error title=Conflict::Biome + ESLint')
		expect(output).toContain('::warning title=Tools::missing')
		expect(output).not.toContain('Passing')
	})

	it('escapes property and data values', () => {
		const tasks = [makeTask('ts/strict', 'A:B, C%', ['tsconfig.json'])]
		const statuses = makeStatuses([['ts/strict', 'patch']])
		const diagnostics: DiagnosticCheck[] = [
			{ name: 'Tool', status: 'fail', message: '100% done\nnext' },
		]

		const output = formatCheckAnnotations(tasks, statuses, diagnostics)

		expect(output).toContain('title=A%3AB%2C C%25')
		expect(output).toContain('100%25 done%0Anext')
		expect(output).not.toContain('A:B, C%')
		expect(output).not.toContain('100% done\n')
	})

	it('annotations join with newline', () => {
		const tasks = [
			makeTask('ts/strict', 'Strict TypeScript', ['tsconfig.json']),
			makeTask('lint/biome', 'Biome', ['biome.json']),
		]
		const statuses = makeStatuses([
			['ts/strict', 'patch'],
			['lint/biome', 'new'],
		])

		const output = formatCheckAnnotations(tasks, statuses, [])

		const lines = output.split('\n')
		expect(lines).toHaveLength(2)
		expect(output).not.toMatch(/\n$/)
	})
})
