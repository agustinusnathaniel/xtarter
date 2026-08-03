import type { ProjectProfile, Task } from '@xtarterize/core'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { collectTaskDiffs } from '@/utils/task-diffs.js'

const profileStub = {} as never

function createTask(id: string, dryRun: Task['dryRun']): Task {
	return {
		id,
		label: id,
		group: 'test',
		applicable: () => true,
		check: async () => 'new',
		dryRun,
		apply: async () => {},
	}
}

describe('collectTaskDiffs', () => {
	beforeEach(() => {
		process.exitCode = 0
	})

	afterEach(() => {
		process.exitCode = 0
	})

	it('collects diffs from successful tasks and counts failures', async () => {
		const goodTask = createTask('good', async () => [
			{ filepath: 'a.txt', before: null, after: 'x' },
		])
		const badTask = createTask('bad', async () => {
			throw new Error('boom')
		})

		const result = await collectTaskDiffs(
			[goodTask, badTask],
			'/tmp',
			profileStub as ProjectProfile,
		)

		expect(result.diffs.length).toBe(1)
		expect(result.failures).toBe(1)
		expect(result.diffs[0]).toEqual({
			filepath: 'a.txt',
			before: null,
			after: 'x',
		})
	})
})
