import fs from 'node:fs/promises'
import { Effect } from 'effect'
import { resolve } from 'pathe'
import { FileSystemError } from '@/errors.js'

export interface EnsureGitignoreResult {
	readonly action: 'created' | 'appended' | 'noop'
}

const GITIGNORE_ENTRY = '/.xtarterize/'
const HEADER = '# xtarterize internal artifacts'

export function ensureXtarterizeGitignore(
	cwd: string,
): Promise<EnsureGitignoreResult> {
	const gitignorePath = resolve(cwd, '.gitignore')

	return Effect.runPromise(
		Effect.orElseSucceed(
			Effect.tryPromise({
				try: async (): Promise<EnsureGitignoreResult> => {
					try {
						const content = await fs.readFile(gitignorePath, 'utf-8')
						if (
							content
								.split('\n')
								.some((line) => line.trim() === GITIGNORE_ENTRY)
						) {
							return { action: 'noop' }
						}
						const newContent = content.endsWith('\n')
							? `${content}${HEADER}\n${GITIGNORE_ENTRY}\n`
							: `${content}\n${HEADER}\n${GITIGNORE_ENTRY}\n`
						await fs.writeFile(gitignorePath, newContent, 'utf-8')
						return { action: 'appended' }
					} catch (err) {
						if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
							const content = `${HEADER}\n${GITIGNORE_ENTRY}\n`
							await fs.writeFile(gitignorePath, content, 'utf-8')
							return { action: 'created' }
						}
						throw err
					}
				},
				catch: (cause) => new FileSystemError({ path: gitignorePath, cause }),
			}),
			() => ({ action: 'noop' }),
		),
	)
}
