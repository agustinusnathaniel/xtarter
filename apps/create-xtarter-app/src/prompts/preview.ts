import { styleText } from 'node:util'
import { cancel, isCancel, text } from '@clack/prompts'
import { getTemplateById, TEMPLATES } from '@/templates/registry'

export async function previewTemplate(templateId?: string): Promise<void> {
	let selectedTemplateId = templateId

	// If template not provided, prompt for it
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

		if (isCancel(result)) {
			cancel('Operation cancelled')
			process.exit(0)
		}

		selectedTemplateId = result.trim()
	}

	const template = getTemplateById(selectedTemplateId)
	if (!template) {
		console.log(
			styleText('red', `✖ Template "${selectedTemplateId}" not found`),
		)
		console.log(
			styleText(
				'yellow',
				`Available templates: ${TEMPLATES.map((t) => t.id).join(', ')}`,
			),
		)
		process.exit(1)
	}

	// Display template info
	console.log(`\n${styleText('bold', styleText('cyan', '═'.repeat(60)))}`)
	console.log(styleText('bold', styleText('white', `  ${template.name}`)))
	console.log(styleText('bold', styleText('cyan', '═'.repeat(60))))
	console.log()
	console.log(`${styleText('gray', 'ID:')}  ${template.id}`)
	console.log(styleText('gray', 'Description:'))
	console.log(`  ${template.description}`)
	console.log()
	console.log(styleText('gray', 'Repository:'))
	console.log(`  https://github.com/${template.repo}`)
	console.log()
	console.log(`${styleText('gray', 'Branch:')}  ${template.branch}`)
	console.log()

	// Show what's included (based on template)
	console.log(styleText('bold', 'Features:'))

	const featureMap: Record<string, string[]> = {
		'next-chakra': [
			'Next.js 16',
			'Chakra UI v3',
			'Biome',
			'Turborepo',
			'TypeScript',
			'Playwright',
		],
		'next-tailwind': [
			'Next.js 16',
			'Tailwind CSS v4',
			'Biome',
			'TypeScript',
			'Playwright',
		],
		'vite-chakra': [
			'Vite 7',
			'React 19',
			'Chakra UI v3',
			'TanStack Router',
			'TanStack Query',
			'Biome',
			'Vitest',
		],
		'vite-tailwind': [
			'Vite 7',
			'React 19',
			'Tailwind CSS v4',
			'TanStack Router',
			'TanStack Query',
			'Biome',
			'Vitest',
		],
		'vite-hero': [
			'Vite 7',
			'React 19',
			'Hero UI',
			'TanStack Router',
			'Biome',
			'Vitest',
		],
	}

	const features = featureMap[template.id] || ['See repository for details']
	for (const feature of features) {
		console.log(`${styleText('green', '  ✔')} ${feature}`)
	}

	console.log()
	console.log(styleText('bold', 'Usage:'))
	console.log(
		`  ${styleText('cyan', `npx create-xtarter-app my-app -t ${template.id}`)}`,
	)
	console.log()
	console.log(styleText('bold', styleText('cyan', '═'.repeat(60))))
	console.log()
}
