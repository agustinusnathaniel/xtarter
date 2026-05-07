import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { getAllTasks, incrementalTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('incrementalTask', () => {
	it('is applicable to TS projects only', async () => {
		const tsProfile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(incrementalTask.applicable(tsProfile)).toBe(true)
	})

	it('returns patch when incremental is missing', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await incrementalTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('patch')
	})

	it('dryRun returns correct diff', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await incrementalTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBe(1)
		expect(diffs[0].after).toContain('incremental')
	})
})

describe('TypeScript task coverage', () => {
	it('registers PRD TypeScript tasks without Ultracite', () => {
		const taskIds = getAllTasks().map((task) => task.id)

		expect(taskIds).toContain('ts/strict')
		expect(taskIds).toContain('ts/paths')
		expect(taskIds).toContain('ts/incremental')
		expect(taskIds).toContain('gitignore/tsbuildinfo')
		expect(taskIds).not.toContain('lint/ultracite')
	})
})
