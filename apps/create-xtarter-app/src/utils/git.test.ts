import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exec } from 'tinyexec'
import { describe, expect, it } from 'vite-plus/test'
import { initializeGit, isGitInstalled } from '@/utils/git'

async function createTempDir(): Promise<string> {
	return mkdtemp(join(tmpdir(), 'cxa-git-test-'))
}

describe('isGitInstalled', () => {
	it('should return true when git is available', async () => {
		const result = await isGitInstalled()
		expect(result).toBe(true)
	})
})

describe('initializeGit', () => {
	it('should init a git repo and create initial commit', async () => {
		const dir = await createTempDir()
		await writeFile(join(dir, 'README.md'), '# test')

		await exec('git', ['config', 'user.email', 'test@test.com'], {
			nodeOptions: { cwd: dir },
		})
		await exec('git', ['config', 'user.name', 'Test User'], {
			nodeOptions: { cwd: dir },
		})

		await initializeGit({ projectPath: dir })

		const log = await exec('git', ['log', '--oneline'], {
			nodeOptions: { cwd: dir },
		})
		expect(log.exitCode).toBe(0)
		expect(log.stdout).toContain('Initial commit')

		await rm(dir, { recursive: true, force: true })
	})
})
