import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	autoUpdateWorkflowTask,
	ciWorkflowTask,
	releaseWorkflowTask,
	renovateTask,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('ciWorkflowTask', () => {
	it('is applicable when hasGitHub is true', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		// The fixture does not have .github, but hasGit checks for .github dir
		expect(ciWorkflowTask.applicable(profile)).toBe(profile.hasGitHub)
	})

	it('renders package-manager-aware quality steps', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const [diff] = await ciWorkflowTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)

		expect(diff.after).toContain('cache: pnpm')
		expect(diff.after).toContain('pnpm run lint')
		expect(diff.after).toContain('pnpm run check')
		expect(diff.after).toContain('pnpm run typecheck')
		expect(diff.after).toContain('pnpm run test')
	})
})

describe('autoUpdateWorkflowTask', () => {
	it('is applicable when hasGitHub is true', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(autoUpdateWorkflowTask.applicable(profile)).toBe(profile.hasGitHub)
	})

	it('updates dependencies and validates the result', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const [diff] = await autoUpdateWorkflowTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)

		expect(diff.after).toContain('pnpm update')
		expect(diff.after).toContain('pnpm dedupe')
		expect(diff.after).toContain('pnpm run lint')
		expect(diff.after).toContain('pnpm run typecheck')
		expect(diff.after).toContain('pnpm run test')
	})
})

describe('releaseWorkflowTask', () => {
	it('is applicable when hasGitHub is true', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(releaseWorkflowTask.applicable(profile)).toBe(profile.hasGitHub)
	})

	it('runs quality checks before release', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const [diff] = await releaseWorkflowTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)

		expect(diff.after).toContain('pnpm run lint')
		expect(diff.after).toContain('pnpm run typecheck')
		expect(diff.after).toContain('pnpm run test')
		expect(diff.after).toContain('pnpm run release')
	})
})

describe('renovateTask', () => {
	it('is applicable when hasGitHub is true', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(renovateTask.applicable(profile)).toBe(profile.hasGitHub)
	})

	it('renders the reference-derived renovate defaults', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		const [diff] = await renovateTask.dryRun(
			path.join(fixtures, 'react-vite-tailwind'),
			profile,
		)
		const config = JSON.parse(diff.after)

		expect(config.extends).toContain('config:base')
		expect(config.extends).toContain('group:all')
		expect(config.timezone).toBe('Asia/Jakarta')
		expect(config.rangeStrategy).toBe('bump')
		expect(config.ignoreDeps).toEqual(['node', 'pnpm'])
		expect(config.updatePinnedDependencies).toBe(false)
		expect(config.stabilityDays).toBe(2)
		expect(config.major.enabled).toBe(false)
		expect(config.packageRules[0].automerge).toBe(true)
		expect(config.packageRules[0].groupName).toBe('all non-major dependencies')
	})
})
