import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import { biomeTask } from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('biomeTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(biomeTask.applicable(profile)).toBe(true)
	})

	it('returns new on clean fixture', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const status = await biomeTask.check(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(status).toBe('new')
	})

	it('dryRun returns diffs', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await biomeTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		expect(diffs.length).toBeGreaterThan(0)
		expect(diffs[0].filepath).toBe('biome.json')
		expect(diffs[0].before).toBeNull()
	})

	it('includes css.tailwindDirectives for tailwind projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const diffs = await biomeTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const config = JSON.parse(diffs[0].after ?? '{}')
		expect(config.css?.parser?.tailwindDirectives).toBe(true)
	})

	it('excludes css.tailwindDirectives for non-tailwind projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-no-styling'),
		)
		const diffs = await biomeTask.dryRun(
			path.join(fixtures, 'react-vite-no-styling'),
			profile,
		)
		const config = JSON.parse(diffs[0].after ?? '{}')
		expect(config.css).toBeUndefined()
	})
})
