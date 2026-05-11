import { cancel, confirm, isCancel } from '@clack/prompts'

export async function promptGitInit(skipGit?: boolean): Promise<boolean> {
	// If --no-git flag is provided, skip git initialization
	if (skipGit) {
		return false
	}

	const result = await confirm({
		message: 'Initialize a git repository?',
		initialValue: true,
	})

	if (isCancel(result)) {
		cancel('Operation cancelled')
		process.exit(0)
	}

	return result
}

export async function promptCleanCI(cleanMode?: boolean): Promise<boolean> {
	// If --clean flag is provided, enable clean mode
	if (cleanMode) {
		return true
	}

	const result = await confirm({
		message: 'Remove CI/CD configurations (GitHub Actions, Vercel, etc.)?',
		initialValue: false,
	})

	if (isCancel(result)) {
		cancel('Operation cancelled')
		process.exit(0)
	}

	return result
}
