import type { ProjectProfile, Task } from '@xtarterize/core'
import { resolveProjectTasks, resolveTaskStatuses } from '@xtarterize/core'
import { describe, expect, it } from 'vite-plus/test'

function makeTask(
	id: string,
	check: () => Promise<'new' | 'patch' | 'skip' | 'conflict'>,
): Task {
	return {
		id,
		label: id,
		group: 'test',
		applicable: () => true,
		check,
		dryRun: async () => [],
		apply: async () => {},
	}
}

const profile: ProjectProfile = {
	framework: 'node',
	bundler: 'none',
	packageManager: 'npm',
	typescript: true,
	monorepo: false,
	workspaceRoot: null,
	detectedFiles: [],
}

describe('resolveTaskStatuses error isolation', () => {
	it('resolves all statuses when one check throws', async () => {
		const tasks = [
			makeTask('ok-task', async () => 'skip'),
			makeTask('boom-task', async () => {
				throw new Error('simulated check failure')
			}),
			makeTask('ok-task-2', async () => 'patch'),
		]

		const statuses = await resolveTaskStatuses(tasks, '/tmp', profile)
		expect(statuses.get('ok-task')).toBe('skip')
		expect(statuses.get('ok-task-2')).toBe('patch')
		// A task whose check throws degrades to conflict (needs attention)
		// instead of crashing the whole resolution.
		expect(statuses.get('boom-task')).toBe('conflict')
	})

	it('resolveProjectTasks does not crash on a throwing check', async () => {
		const tasks = [
			makeTask('boom-task', async () => {
				throw new Error('simulated check failure')
			}),
			makeTask('ok-task', async () => 'skip'),
		]

		const result = await resolveProjectTasks('/tmp', tasks)
		expect(result.tasks.length).toBe(2)
		expect(result.statuses.get('ok-task')).toBe('skip')
	})
})
