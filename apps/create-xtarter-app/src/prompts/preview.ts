import { text } from '@clack/prompts'
import { abortIfCancelled, pc } from '@xtarterize/core'
import { getTemplateById, TEMPLATES } from '@/templates/registry'

export async function previewTemplate(templateId?: string): Promise<void> {
	let selectedTemplateId = templateId

	if (!selectedTemplateId) {
		const result = await text({
			message: 'Which template would you like to preview?',
			placeholder: 'vite-tailwind',
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Template ID is required'
				}
				const template = getTemplateById(value)
				if (!template) {
					return `Unknown template "${value}". Valid: ${TEMPLATES.map((t) => t.id).join(', ')}`
				}
			},
		})

		abortIfCancelled(result)

		selectedTemplateId = result.trim()
	}

	const template = getTemplateById(selectedTemplateId)
	if (!template) {
		console.log(pc.red(`✖ Template "${selectedTemplateId}" not found`))
		console.log(
			pc.yellow(
				`Available templates: ${TEMPLATES.map((t) => t.id).join(', ')}`,
			),
		)
		process.exit(1)
	}

	console.log(`\n${pc.bold(pc.cyan('═'.repeat(60)))}`)
	console.log(pc.bold(pc.white(`  ${template.name}`)))
	console.log(pc.bold(pc.cyan('═'.repeat(60))))
	console.log()
	console.log(`${pc.dim('ID:')}  ${template.id}`)
	console.log(pc.dim('Description:'))
	console.log(`  ${template.description}`)
	console.log()
	console.log(pc.dim('Repository:'))
	console.log(`  https://github.com/${template.repo}`)
	console.log()
	console.log(`${pc.dim('Branch:')}  ${template.branch}`)
	console.log()

	console.log(pc.bold('Features:'))

	for (const feature of template.features) {
		console.log(`${pc.green('  ✔')} ${feature}`)
	}

	console.log()
	console.log(pc.bold('Usage:'))
	console.log(`  ${pc.cyan(`npx create-xtarter-app my-app -t ${template.id}`)}`)
	console.log()
	console.log(pc.bold(pc.cyan('═'.repeat(60))))
	console.log()
}
