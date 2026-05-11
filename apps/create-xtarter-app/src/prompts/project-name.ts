import { text } from '@clack/prompts'
import { abortIfCancelled } from '@xtarterize/core'

const PROJECT_NAME_REGEX = /^[a-zA-Z0-9-_]+$/

export async function promptProjectName(
	defaultValue?: string,
): Promise<string> {
	const result = await text({
		message: 'What is your project named?',
		placeholder: defaultValue || 'my-app',
		defaultValue,
		validate: (value) => {
			if (!value || value.trim().length === 0) {
				return 'Project name is required'
			}
			if (!PROJECT_NAME_REGEX.test(value)) {
				return 'Name can only contain letters, numbers, hyphens, and underscores'
			}
			if (value.length > 214) {
				return 'Name must be less than 214 characters'
			}
		},
	})

	abortIfCancelled(result)

	return result.trim()
}
