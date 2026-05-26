import { existsSync } from 'node:fs'
import {
	access,
	mkdir,
	readdir,
	readFile,
	rm,
	writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import {
	prepareProjectDir,
	resolveProjectPath,
	scaffoldProject,
} from '@/scaffold'
import { TEMPLATES } from '@/templates/registry'

function tempDir() {
	return join(
		tmpdir(),
		`cxa-scaffold-test-${Math.random().toString(36).slice(2, 8)}`,
	)
}

async function writeFixture(dir: string): Promise<void> {
	await mkdir(dir, { recursive: true })
	await writeFile(
		join(dir, 'package.json'),
		JSON.stringify({ name: 'template', version: '1.0.0' }),
	)
}

describe('resolveProjectPath', () => {
	it('should resolve a named project path', () => {
		const result = resolveProjectPath('my-app')
		expect(result.projectName).toBe('my-app')
		expect(result.projectPath).toContain('my-app')
	})

	it('should resolve "." to cwd with basename', () => {
		const result = resolveProjectPath('.')
		expect(result.projectPath).toBe(process.cwd())
		expect(result.projectName).toBeDefined()
		expect(result.projectName.length).toBeGreaterThan(0)
	})

	it('should throw for empty name', () => {
		expect(() => resolveProjectPath('')).toThrow('Project name is required')
	})
})

describe('prepareProjectDir', () => {
	it('should create a new directory', async () => {
		const dir = tempDir()
		await prepareProjectDir('test', dir)
		await expect(access(dir)).resolves.toBeUndefined()
		await rm(dir, { recursive: true, force: true })
	})

	it('should accept existing empty directory', async () => {
		const dir = tempDir()
		await mkdir(dir, { recursive: true })
		await prepareProjectDir('test', dir)
		await expect(access(dir)).resolves.toBeUndefined()
		await rm(dir, { recursive: true, force: true })
	})

	it('should throw for non-empty directory without force', async () => {
		const dir = tempDir()
		await writeFixture(dir)
		await expect(prepareProjectDir('test', dir)).rejects.toThrow(
			'already exists',
		)
		await rm(dir, { recursive: true, force: true })
	})

	it('should overwrite non-empty directory with force', async () => {
		const dir = tempDir()
		await writeFixture(dir)
		await prepareProjectDir('test', dir, true)
		await expect(access(dir)).resolves.toBeUndefined()
		const files = await readdir(dir)
		expect(files.length).toBe(0)
		await rm(dir, { recursive: true, force: true })
	})
})

describe('scaffoldProject', () => {
	it('should modify package.json name', async () => {
		const dir = tempDir()
		await writeFixture(dir)

		const result = await scaffoldProject({
			projectName: 'my-project',
			projectPath: dir,
			template: TEMPLATES[0],
			packageManager: 'pnpm',
			cleanCI: false,
			initGit: false,
			skipDownload: true,
		})

		const content = await readFile(join(dir, 'package.json'), 'utf-8')
		const pkg = JSON.parse(content)
		expect(pkg.name).toBe('my-project')
		expect(result.projectName).toBe('my-project')
		expect(result.gitInitialized).toBe(false)
		expect(result.ciCleaned).toBe(false)
		await rm(dir, { recursive: true, force: true })
	})

	it('should clean CI configs when enabled', async () => {
		const dir = tempDir()
		await writeFixture(dir)
		await writeFile(join(dir, 'vercel.json'), JSON.stringify({}))

		const result = await scaffoldProject({
			projectName: 'test',
			projectPath: dir,
			template: TEMPLATES[0],
			packageManager: 'pnpm',
			cleanCI: true,
			initGit: false,
			skipDownload: true,
		})

		await expect(access(join(dir, 'vercel.json'))).rejects.toThrow()
		expect(result.ciCleaned).toBe(true)
		await rm(dir, { recursive: true, force: true })
	})

	it('should initialize git when enabled', async () => {
		const dir = tempDir()
		await writeFixture(dir)

		const result = await scaffoldProject({
			projectName: 'test',
			projectPath: dir,
			template: TEMPLATES[0],
			packageManager: 'pnpm',
			cleanCI: false,
			initGit: true,
			skipDownload: true,
		})

		expect(existsSync(join(dir, '.git'))).toBe(true)
		expect(result.gitInitialized).toBe(true)
		await rm(dir, { recursive: true, force: true })
	})

	it('should clean up created dir on failure', async () => {
		const dir = tempDir()
		const _pkgPath = join(dir, 'package.json')

		await expect(
			scaffoldProject({
				projectName: 'fail',
				projectPath: dir,
				template: TEMPLATES[0],
				packageManager: 'pnpm',
				cleanCI: false,
				initGit: false,
				skipDownload: true,
			}),
		).rejects.toThrow()

		expect(existsSync(dir)).toBe(false)
	})

	it('should not clean up pre-existing dir on failure', async () => {
		const dir = tempDir()
		await mkdir(dir, { recursive: true })
		await writeFile(join(dir, 'keep-me.txt'), 'data')

		await expect(
			scaffoldProject({
				projectName: 'exist',
				projectPath: dir,
				template: TEMPLATES[0],
				packageManager: 'pnpm',
				cleanCI: false,
				initGit: false,
				skipDownload: true,
			}),
		).rejects.toThrow()

		expect(existsSync(dir)).toBe(true)
		await rm(dir, { recursive: true, force: true })
	})

	it('should handle full scaffold end-to-end', async () => {
		const dir = tempDir()
		await writeFixture(dir)
		const ciDir = join(dir, '.github', 'workflows')
		await mkdir(ciDir, { recursive: true })
		await writeFile(join(ciDir, 'ci.yml'), 'name: CI')

		const result = await scaffoldProject({
			projectName: 'full-test',
			projectPath: dir,
			template: TEMPLATES[0],
			packageManager: 'pnpm',
			cleanCI: true,
			initGit: true,
			skipDownload: true,
		})

		const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
		expect(pkg.name).toBe('full-test')
		expect(existsSync(join(dir, '.git'))).toBe(true)
		expect(existsSync(join(dir, '.github'))).toBe(false)
		expect(result.projectName).toBe('full-test')
		expect(result.gitInitialized).toBe(true)
		expect(result.ciCleaned).toBe(true)
		expect(result.template.id).toBe(TEMPLATES[0].id)
		expect(result.packageManager).toBe('pnpm')
		await rm(dir, { recursive: true, force: true })
	}, 30000)
})
