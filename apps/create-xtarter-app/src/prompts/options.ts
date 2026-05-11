import { confirm } from '@clack/prompts'
import { abortIfCancelled } from '@xtarterize/core'

export async function promptGitInit(skipGit?: boolean): Promise<boolean> {
	if (skipGit) {
		return false
	}

	const result = await confirm({
		message: 'Initialize a git repository?',
		initialValue: true,
	})

	abortIfCancelled(result)

	return result
}

export async function promptCleanCI(cleanMode?: boolean): Promise<boolean> {
	if (cleanMode) {
		return true
	}

	const result = await confirm({
		message: 'Remove CI/CD configurations (GitHub Actions, Vercel, etc.)?',
		initialValue: false,
	})

	abortIfCancelled(result)

	return result
}
