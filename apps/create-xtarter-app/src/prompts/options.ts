import { confirm } from '@clack/prompts'
import { abortIfCancelled } from '@xtarterize/core'

export async function promptGitInit(skipGit?: boolean): Promise<boolean> {
	if (skipGit !== undefined) {
		return !skipGit
	}

	const result = await confirm({
		message: 'Initialize a git repository?',
		initialValue: true,
	})

	abortIfCancelled(result)

	return result
}

export async function promptCleanCI(cleanMode?: boolean): Promise<boolean> {
	if (cleanMode !== undefined) {
		return cleanMode
	}

	const result = await confirm({
		message: 'Remove CI/CD configurations (GitHub Actions, Vercel, etc.)?',
		initialValue: false,
	})

	abortIfCancelled(result)

	return result
}
