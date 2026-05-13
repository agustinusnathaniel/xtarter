import { createJsonMergeTask } from '@/factory'
import {
	renderOxfmtConfig,
	renderOxlintConfig,
} from '@/templates/oxlint-json.js'

export const oxlintTask = createJsonMergeTask({
	id: 'lint/oxlint',
	label: 'Oxlint config (.oxlintrc.json)',
	group: 'Linting & Formatting',
	applicable: (profile) =>
		!profile.existing.eslint &&
		!profile.existing.biome &&
		(profile.vitePlus || profile.existing.oxlint),
	filepath: '.oxlintrc.json',
	extensions: ['.json', '.jsonc'],
	incoming: (_cwd, profile) => JSON.parse(renderOxlintConfig(profile)),
})

export const oxfmtTask = createJsonMergeTask({
	id: 'lint/oxfmt',
	label: 'Oxfmt config (.oxfmtrc.json)',
	group: 'Linting & Formatting',
	applicable: (profile) =>
		!profile.existing.eslint &&
		!profile.existing.biome &&
		(profile.vitePlus || profile.existing.oxfmt),
	filepath: '.oxfmtrc.json',
	extensions: ['.json', '.jsonc'],
	incoming: (_cwd, profile) => JSON.parse(renderOxfmtConfig(profile)),
})
