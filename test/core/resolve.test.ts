import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProjectProfile, Task, TaskScope } from '@xtarterize/core'
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

describe('resolveTasks - scope filtering', () => {
	function mockTask(id: string, scope: TaskScope | undefined): Task {
		return {
			id,
			label: id,
			group: 'test',
			scope,
			applicable: () => true,
			check: async () => 'skip' as const,
			dryRun: async () => [],
			apply: async () => {},
		}
	}

	function mockProfile(overrides: Partial<ProjectProfile>): ProjectProfile {
		return {
			framework: 'node',
			frameworkVersion: null,
			bundler: null,
			router: null,
			styling: ['vanilla'],
			typescript: false,
			runtime: 'node',
			packageManager: 'pnpm',
			vitePlus: false,
			monorepo: false,
			monorepoTool: null,
			workspaceRoot: false,
			nodeVersion: '20',
			hasGitHub: false,
			hasGit: false,
			existing: {
				biome: false,
				oxlint: false,
				oxfmt: false,
				eslint: false,
				tsconfig: false,
				renovate: false,
				commitlint: false,
				knip: false,
				plop: false,
				turbo: false,
				vscodeSettings: false,
				agentsMd: false,
				githubWorkflows: [],
				viteConfig: false,
				versionrc: false,
				gitignore: false,
				changeset: false,
			},
			...overrides,
		}
	}

	const rootTask = mockTask('test/root', 'root')
	const packageTask = mockTask('test/package', 'package')
	const bothTask = mockTask('test/both', 'both')
	const noScopeTask = mockTask('test/noscope', undefined)

	it('includes all tasks regardless of scope in non-monorepo', () => {
		const profile = mockProfile({ monorepo: false })
		const tasks = resolveTasks(profile, [
			rootTask,
			packageTask,
			bothTask,
			noScopeTask,
		])
		expect(tasks).toHaveLength(4)
		expect(tasks.map((t) => t.id)).toEqual([
			'test/root',
			'test/package',
			'test/both',
			'test/noscope',
		])
	})

	it('excludes package-scoped tasks at monorepo root', () => {
		const profile = mockProfile({ monorepo: true, workspaceRoot: true })
		const tasks = resolveTasks(profile, [
			rootTask,
			packageTask,
			bothTask,
			noScopeTask,
		])
		expect(tasks).toHaveLength(3)
		expect(tasks.map((t) => t.id)).toEqual([
			'test/root',
			'test/both',
			'test/noscope',
		])
	})

	it('excludes root-scoped tasks inside workspace package', () => {
		const profile = mockProfile({ monorepo: true, workspaceRoot: false })
		const tasks = resolveTasks(profile, [
			rootTask,
			packageTask,
			bothTask,
			noScopeTask,
		])
		expect(tasks).toHaveLength(3)
		expect(tasks.map((t) => t.id)).toEqual([
			'test/package',
			'test/both',
			'test/noscope',
		])
	})

	it('applies applicable() filter before scope filter', () => {
		const nonApplicableTask: Task = {
			...packageTask,
			applicable: () => false,
		}
		const profile = mockProfile({ monorepo: true, workspaceRoot: false })
		const tasks = resolveTasks(profile, [rootTask, nonApplicableTask])
		// nonApplicableTask excluded by applicable(), rootTask excluded by scope
		expect(tasks).toHaveLength(0)
	})

	it('tasks without explicit scope are included everywhere', () => {
		const rootProfile = mockProfile({ monorepo: true, workspaceRoot: true })
		const packageProfile = mockProfile({
			monorepo: true,
			workspaceRoot: false,
		})

		const rootTasks = resolveTasks(rootProfile, [noScopeTask])
		expect(rootTasks).toHaveLength(1)
		expect(rootTasks[0].id).toBe('test/noscope')

		const packageTasks = resolveTasks(packageProfile, [noScopeTask])
		expect(packageTasks).toHaveLength(1)
		expect(packageTasks[0].id).toBe('test/noscope')
	})
})

// Need to import detectProject for the test above
import { detectProject } from '@xtarterize/core'
