import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectProject } from '@xtarterize/core'
import {
	getAllTasks,
	pnpmWorkspaceTask,
	versionrcTask,
} from '@xtarterize/tasks'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.resolve(__dirname, '../fixtures')

describe('pnpmWorkspaceTask', () => {
	it('is applicable to pnpm projects', async () => {
		const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'))
		expect(pnpmWorkspaceTask.applicable(profile)).toBe(true)
	})

	it('is not applicable to npm projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-no-styling'),
		)
		expect(pnpmWorkspaceTask.applicable(profile)).toBe(false)
	})

	it('skips when pnpm-workspace.yaml already exists', async () => {
		const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'))
		const status = await pnpmWorkspaceTask.check(
			path.join(fixtures, 'monorepo-turbo'),
			profile,
		)
		expect(status).toBe('skip')
	})

	it('returns new when pnpm-workspace.yaml is missing in a pnpm project', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-pnpm-new-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'pnpm-new-test' }),
			)
			// Write a pnpm lockfile so detection returns pnpm
			await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '')
			const profile = await detectProject(tmpDir)
			const status = await pnpmWorkspaceTask.check(tmpDir, profile)
			expect(status).toBe('new')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('dryRun returns expected content', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-pnpm-dryrun-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'dryrun-test' }),
			)
			await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '')
			const profile = await detectProject(tmpDir)
			const diffs = await pnpmWorkspaceTask.dryRun(tmpDir, profile)
			expect(diffs.length).toBe(1)
			expect(diffs[0].filepath).toBe('pnpm-workspace.yaml')
			expect(diffs[0].before).toBeNull()
			expect(diffs[0].after).toContain("'apps/*'")
			expect(diffs[0].after).toContain("'packages/*'")
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('apply writes the expected file', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-pnpm-workspace-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'apply-test' }),
			)
			// Write a pnpm lockfile to trigger pnpm detection
			await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '')
			const profile = await detectProject(tmpDir)
			await pnpmWorkspaceTask.apply(tmpDir, profile)
			const content = await fs.readFile(
				path.join(tmpDir, 'pnpm-workspace.yaml'),
				'utf-8',
			)
			expect(content).toContain("'apps/*'")
			expect(content).toContain("'packages/*'")
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('versionrcTask', () => {
	it('is applicable to all projects', async () => {
		const profile = await detectProject(
			path.join(fixtures, 'react-vite-tailwind'),
		)
		expect(versionrcTask.applicable(profile)).toBe(true)
	})

	it('returns new when .versionrc.json is missing', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-vrc-check-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'vrc-check-test' }),
			)
			const profile = await detectProject(tmpDir)
			const status = await versionrcTask.check(tmpDir, profile)
			expect(status).toBe('new')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('dryRun returns expected content', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-vrc-dryrun-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'vrc-dryrun-test' }),
			)
			const profile = await detectProject(tmpDir)
			const diffs = await versionrcTask.dryRun(tmpDir, profile)
			expect(diffs.length).toBe(1)
			expect(diffs[0].filepath).toBe('.versionrc.json')
			expect(diffs[0].before).toBeNull()
			expect(diffs[0].after).toContain('"bumpFiles"')
			expect(diffs[0].after).toContain('"feat"')
			expect(diffs[0].after).toContain('"fix"')
			expect(diffs[0].after).toContain('"refactor"')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})

	it('apply writes the expected file', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'xtarterize-versionrc-'),
		)
		try {
			await fs.writeFile(
				path.join(tmpDir, 'package.json'),
				JSON.stringify({ name: 'apply-test' }),
			)
			const profile = await detectProject(tmpDir)
			await versionrcTask.apply(tmpDir, profile)
			const content = await fs.readFile(
				path.join(tmpDir, '.versionrc.json'),
				'utf-8',
			)
			const parsed = JSON.parse(content)
			expect(parsed.bumpFiles).toEqual(['package.json'])
			expect(parsed.types).toBeDefined()
			expect(parsed.types[0].type).toBe('feat')
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true })
		}
	})
})

describe('task registration', () => {
	it('both tasks are registered in getAllTasks()', () => {
		const tasks = getAllTasks()
		const ids = tasks.map((t) => t.id)
		expect(ids).toContain('workspace/pnpm-workspace')
		expect(ids).toContain('release/versionrc')
	})

	it('pnpmWorkspaceTask is exported', () => {
		expect(pnpmWorkspaceTask).toBeDefined()
		expect(pnpmWorkspaceTask.id).toBe('workspace/pnpm-workspace')
	})

	it('versionrcTask is exported', () => {
		expect(versionrcTask).toBeDefined()
		expect(versionrcTask.id).toBe('release/versionrc')
	})
})
