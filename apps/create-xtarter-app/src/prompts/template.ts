import { cancel, isCancel, select } from '@clack/prompts'
import type { TemplateConfig } from '@/templates/registry'
import { getTemplateById, getTemplateChoices } from '@/templates/registry'

export async function promptTemplate(
	selectedTemplate?: string,
): Promise<TemplateConfig> {
	// If template is provided via CLI flag, validate and return it
	if (selectedTemplate) {
		const template = getTemplateById(selectedTemplate)
		if (!template) {
			const validTemplates = getTemplateChoices()
				.map((t) => t.value)
				.join(', ')
			throw new Error(
				`Unknown template "${selectedTemplate}". Valid options: ${validTemplates}`,
			)
		}
		return template
	}

	// Otherwise, prompt the user
	const result = await select({
		message: 'Which template would you like to use?',
		options: getTemplateChoices(),
	})

	if (isCancel(result)) {
		cancel('Operation cancelled')
		process.exit(0)
	}

	const template = getTemplateById(result)
	if (!template) {
		throw new Error(`Failed to get template info for "${result}"`)
	}

	return template
}
