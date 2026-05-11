import { select } from '@clack/prompts'
import { abortIfCancelled } from '@xtarterize/core'
import type { TemplateConfig } from '@/templates/registry'
import { getTemplateById, getTemplateChoices } from '@/templates/registry'

export async function promptTemplate(
	selectedTemplate?: string,
): Promise<TemplateConfig> {
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

	const result = await select({
		message: 'Which template would you like to use?',
		options: getTemplateChoices(),
	})

	abortIfCancelled(result)

	const template = getTemplateById(result)
	if (!template) {
		throw new Error(`Failed to get template info for "${result}"`)
	}

	return template
}
