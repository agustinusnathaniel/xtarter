import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveTaskStatuses, resolveTasks } from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('resolveTasks', () => {
	it('filters tasks by applicability', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const allTasks = getAllTasks()
		const tasks = resolveTasks(profile, allTasks)
		expect(tasks.length).toBeGreaterThan(0)
		expect(tasks.length).toBeLessThan(allTasks.length)

		// Vite tasks should be present for vite bundler
		const viteTasks = tasks.filter((t) => t.group === 'Vite Plugins')
		expect(viteTasks.length).toBeGreaterThan(0)
	})

	it('excludes vite tasks for non-vite projects', async () => {
		const profile = await detectProject(path.join(fixtures, 'nextjs'))
		const allTasks = getAllTasks()
		const tasks = resolveTasks(profile, allTasks)
		const viteTasks = tasks.filter((t) => t.group === 'Vite Plugins')
		expect(viteTasks).toHaveLength(0)
	})
})

describe('resolveTaskStatuses', () => {
	it('resolves statuses for all tasks', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const allTasks = getAllTasks()
		const tasks = resolveTasks(profile, allTasks)
		const statuses = await resolveTaskStatuses(
			tasks,
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)

		for (const task of tasks) {
			expect(statuses.has(task.id)).toBe(true)
			const status = statuses.get(task.id)
			expect(['new', 'patch', 'skip', 'conflict']).toContain(status)
		}
	})
})

// Need to import detectProject for the test above
import { detectProject } from '@xtarterize/core'
