import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	detectProject,
	resolveTaskStatuses,
	resolveTasks,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('init integration', () => {
	const allTasks = getAllTasks()

	it('runs full init on react-vite-tailwind (biome baseline)', async () => {
		const testDir = path.join(fixtures, 'react-vite-tailwind')
		const profile = await detectProject(testDir)
		expect(profile.framework).toBe('react')
		expect(profile.bundler).toBe('vite')

		const tasks = resolveTasks(profile, allTasks)
		expect(tasks.length).toBeGreaterThan(0)
		expect(tasks.some((t) => t.id === 'lint/biome')).toBe(true)
		expect(tasks.some((t) => t.id === 'lint/oxlint')).toBe(false)
		expect(tasks.some((t) => t.id === 'lint/oxfmt')).toBe(false)

		const statuses = await resolveTaskStatuses(tasks, testDir, profile)
		const actionableTasks = tasks.filter((t) => {
			const status = statuses.get(t.id)
			return status === 'new' || status === 'patch'
		})
		expect(actionableTasks.length).toBeGreaterThan(0)
	})

	it('applies oxlint/oxfmt tasks on vite-plus-no-lint, not biome', async () => {
		const testDir = path.join(fixtures, 'vite-plus-no-lint')
		const profile = await detectProject(testDir)
		expect(profile.vitePlus).toBe(true)
		expect(profile.existing.biome).toBe(false)

		const tasks = resolveTasks(profile, allTasks)
		expect(tasks.some((t) => t.id === 'lint/biome')).toBe(false)
		expect(tasks.some((t) => t.id === 'lint/oxlint')).toBe(true)
		expect(tasks.some((t) => t.id === 'lint/oxfmt')).toBe(true)
	})

	it('skips oxlint/oxfmt on vite-plus-biome, applies biome', async () => {
		const testDir = path.join(fixtures, 'vite-plus-biome')
		const profile = await detectProject(testDir)
		expect(profile.vitePlus).toBe(true)
		expect(profile.existing.biome).toBe(true)

		const tasks = resolveTasks(profile, allTasks)
		expect(tasks.some((t) => t.id === 'lint/biome')).toBe(true)
		expect(tasks.some((t) => t.id === 'lint/oxlint')).toBe(false)
		expect(tasks.some((t) => t.id === 'lint/oxfmt')).toBe(false)
	})

	it('skips all lint tasks on eslint-project', async () => {
		const testDir = path.join(fixtures, 'eslint-project')
		const profile = await detectProject(testDir)
		expect(profile.existing.eslint).toBe(true)

		const tasks = resolveTasks(profile, allTasks)
		expect(tasks.some((t) => t.id === 'lint/biome')).toBe(false)
		expect(tasks.some((t) => t.id === 'lint/oxlint')).toBe(false)
		expect(tasks.some((t) => t.id === 'lint/oxfmt')).toBe(false)
	})

	it('skips biome on standalone oxlint, applies oxlint task', async () => {
		const testDir = path.join(fixtures, 'oxlint-standalone')
		const profile = await detectProject(testDir)
		expect(profile.existing.oxlint).toBe(true)
		expect(profile.existing.oxfmt).toBe(false)
		expect(profile.vitePlus).toBe(false)

		const tasks = resolveTasks(profile, allTasks)
		expect(tasks.some((t) => t.id === 'lint/biome')).toBe(false)
		// oxlint task applies because existing.oxlint is true
		expect(tasks.some((t) => t.id === 'lint/oxlint')).toBe(true)
		// oxfmt task does not apply because no Vite+ and no existing.oxfmt
		expect(tasks.some((t) => t.id === 'lint/oxfmt')).toBe(false)
	})
})
