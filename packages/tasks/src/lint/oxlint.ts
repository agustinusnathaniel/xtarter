import { mergeJson, parseJsonc } from '@xtarterize/patchers'
import { createFileTask, deepEqual } from '@/factory'
import { renderOxfmtTsConfig } from '@/templates/oxfmt-template.js'
import {
	renderOxlintJsonConfig,
	renderOxlintTsConfig,
} from '@/templates/oxlint-template.js'

export const oxlintTask = createFileTask({
	id: 'lint/oxlint',
	label: 'Oxlint config',
	group: 'Linting & Formatting',
	applicable: (profile) =>
		!profile.existing.eslint &&
		!profile.existing.biome &&
		(profile.vitePlus || profile.existing.oxlint),
	filepath: 'oxlint.config',
	extensions: ['.ts', '.js', '.mjs', '.json'],
	depNames: ['oxlint', 'ultracite'],
	installDev: true,
	render: (profile, existing) => {
		if (existing?.trim().startsWith('{')) {
			const existingConfig = parseJsonc(existing) as Record<string, unknown>
			const desiredConfig = JSON.parse(
				renderOxlintJsonConfig(profile),
			) as Record<string, unknown>
			const merged = mergeJson(existingConfig, desiredConfig)
			return JSON.stringify(merged, null, 2)
		}

		return renderOxlintTsConfig(profile)
	},
	async checkFn(_cwd, profile, fullPath, content) {
		if (!fullPath || !content) return 'new'

		if (content.trim().startsWith('{')) {
			const existing = JSON.parse(content) as Record<string, unknown>
			const desired = JSON.parse(renderOxlintJsonConfig(profile)) as Record<
				string,
				unknown
			>
			const merged = mergeJson(existing, desired)
			if (deepEqual(existing, merged)) return 'skip'
			return 'patch'
		}

		if (content.includes('ultracite/oxlint/')) {
			return 'skip'
		}

		return 'conflict'
	},
})

export const oxfmtTask = createFileTask({
	id: 'lint/oxfmt',
	label: 'Oxfmt config',
	group: 'Linting & Formatting',
	applicable: (profile) =>
		!profile.existing.eslint &&
		!profile.existing.biome &&
		(profile.vitePlus || profile.existing.oxfmt),
	filepath: 'oxfmt.config',
	extensions: ['.ts', '.js', '.mjs', '.json'],
	depNames: ['oxfmt', 'ultracite'],
	installDev: true,
	render: (_profile, existing) => {
		if (existing?.trim().startsWith('{')) {
			return existing
		}

		return renderOxfmtTsConfig(_profile)
	},
	async checkFn(_cwd, _profile, fullPath, content) {
		if (!fullPath || !content) return 'new'

		if (content.trim().startsWith('{')) {
			return 'skip'
		}

		if (content.includes('ultracite/oxfmt')) {
			return 'skip'
		}

		return 'skip'
	},
})
