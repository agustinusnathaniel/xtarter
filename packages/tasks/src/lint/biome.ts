import { createJsonMergeTask } from '@/factory'
import { renderBiomeJson } from '@/templates/biome-json.js'

export const biomeTask = createJsonMergeTask({
	id: 'lint/biome',
	label: 'Biome (lint + format)',
	group: 'Linting & Formatting',
	searchMeta: {
		tags: ['linting', 'formatting', 'all-in-one', 'quality'],
		configTargets: ['biome.json'],
		keywords: ['biome', 'linter', 'formatter', 'lint', 'format', 'all-in-one'],
	},
	applicable: (profile) =>
		!profile.existing.eslint &&
		!profile.existing.oxlint &&
		!profile.existing.oxfmt &&
		(profile.existing.biome || !profile.vitePlus),
	filepath: 'biome.json',
	extensions: ['.json', '.jsonc'],
	incoming: (_cwd, profile) => JSON.parse(renderBiomeJson(profile)),
	depNames: ['@biomejs/biome', 'ultracite'],
	installDev: true,
})
