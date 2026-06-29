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

		const prevAuthorName = process.env.GIT_AUTHOR_NAME
		const prevAuthorEmail = process.env.GIT_AUTHOR_EMAIL
		const prevCommitterName = process.env.GIT_COMMITTER_NAME
		const prevCommitterEmail = process.env.GIT_COMMITTER_EMAIL
		process.env.GIT_AUTHOR_NAME = 'Test User'
		process.env.GIT_AUTHOR_EMAIL = 'test@test.com'
		process.env.GIT_COMMITTER_NAME = 'Test User'
		process.env.GIT_COMMITTER_EMAIL = 'test@test.com'
		try {
			await initializeGit({ projectPath: dir })
		} finally {
			process.env.GIT_AUTHOR_NAME = prevAuthorName
			process.env.GIT_AUTHOR_EMAIL = prevAuthorEmail
			process.env.GIT_COMMITTER_NAME = prevCommitterName
			process.env.GIT_COMMITTER_EMAIL = prevCommitterEmail
		}

		const log = await exec('git', ['log', '--oneline'], {
			nodeOptions: { cwd: dir },
		})
		expect(log.exitCode).toBe(0)
		expect(log.stdout).toContain('Initial commit')

		await rm(dir, { recursive: true, force: true })
	})
})
