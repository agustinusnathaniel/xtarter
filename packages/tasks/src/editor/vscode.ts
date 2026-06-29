import { createMultiFileJsonMergeTask } from '@/factory'
import { renderVscodeExtensions } from '@/templates/vscode/extensions.js'
import { renderVscodeSettings } from '@/templates/vscode/settings.js'

function mergeExtensions(existing: object, incoming: object): object {
	const existingRecs = (existing as Record<string, unknown>).recommendations
	const incomingRecs = (incoming as Record<string, unknown>).recommendations
	if (!Array.isArray(incomingRecs)) return { ...existing, ...incoming }
	const existingArr = Array.isArray(existingRecs)
		? (existingRecs as string[])
		: []
	const union = [...new Set([...existingArr, ...(incomingRecs as string[])])]
	return { ...existing, recommendations: union }
}

export const vscodeTask = createMultiFileJsonMergeTask({
	id: 'editor/vscode',
	label: 'VSCode settings + extensions',
	group: 'Editor',
	scope: 'root',
	applicable: () => true,
	files: [
		{
			filepath: '.vscode/settings.json',
			extensions: ['.json'],
			incoming: (profile) => JSON.parse(renderVscodeSettings(profile)),
		},
		{
			filepath: '.vscode/extensions.json',
			extensions: ['.json'],
			incoming: (profile) => JSON.parse(renderVscodeExtensions(profile)),
			merge: mergeExtensions,
		},
	],
})
