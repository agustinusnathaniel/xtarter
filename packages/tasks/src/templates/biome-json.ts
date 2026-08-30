import type { ProjectProfile } from '@xtarterize/core'
import {
	getUltraciteFrameworkPresetSuffix,
	getUltraciteRouterPresetSuffix,
} from './ultracite-presets.js'

function getUltraciteExtends(profile: ProjectProfile): string[] {
	const presets = ['ultracite/biome/core']

	const frameworkPreset = getUltraciteFrameworkPresetSuffix(profile)
	if (frameworkPreset) {
		presets.push(`ultracite/biome/${frameworkPreset}`)
	}

	const routerPreset = getUltraciteRouterPresetSuffix(profile)
	if (routerPreset) {
		presets.push(`ultracite/biome/${routerPreset}`)
	}

	return presets
}

function buildBiomeFilesConfig(): Record<string, unknown> {
	return {
		ignoreUnknown: false,
		includes: [
			'src/**/*',
			'*.config.ts',
			'!**/*.css',
			'!**/*.d.ts',
			'!.agents',
			'!.claude',
		],
	}
}

// Biome 2.5.9: only skipBlankLines is supported (skipComments not in schema); Oxlint supports both
function buildBiomeLinterRules(): Record<string, unknown> {
	return {
		complexity: {
			noExcessiveLinesPerFunction: {
				level: 'error',
				options: { maxLines: 60 },
			},
		},
		style: {
			useConsistentTypeDefinitions: 'off',
			useConsistentArrayType: {
				level: 'error',
				options: { syntax: 'generic' },
			},
			useFilenamingConvention: {
				level: 'error',
				options: { filenameCases: ['kebab-case'] },
			},
			useBlockStatements: 'error',
			noExcessiveLinesPerFile: {
				level: 'error',
				options: {
					maxLines: 500,
					skipBlankLines: true,
				},
			},
		},
	}
}

function buildBiomeAssistConfig(): Record<string, unknown> {
	return {
		enabled: true,
		actions: {
			source: {
				organizeImports: {
					level: 'on',
					options: {
						groups: [
							[':URL:', ':NODE:', ':PACKAGE:'],
							':BLANK_LINE:',
							[':ALIAS:'],
							':BLANK_LINE:',
							[':PATH:'],
						],
					},
				},
			},
		},
	}
}

function buildBiomeOverrides(): Array<Record<string, unknown>> {
	return [
		{
			includes: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
			linter: {
				rules: {
					nursery: {
						useConsistentTestIt: {
							level: 'error',
							options: {
								function: 'it',
								withinDescribe: 'test',
							},
						},
					},
					complexity: {
						noExcessiveLinesPerFunction: 'off',
					},
				},
			},
		},
	]
}

function buildBiomeConfig(profile: ProjectProfile): Record<string, unknown> {
	return {
		$schema: './node_modules/@biomejs/biome/configuration_schema.json',
		vcs: { enabled: true, clientKind: 'git', useIgnoreFile: true },
		extends: getUltraciteExtends(profile),
		files: buildBiomeFilesConfig(),
		formatter: { enabled: true, indentStyle: 'space' },
		linter: {
			enabled: true,
			rules: buildBiomeLinterRules(),
		},
		javascript: { formatter: { quoteStyle: 'single' } },
		assist: buildBiomeAssistConfig(),
		overrides: buildBiomeOverrides(),
	}
}

function hasTailwindStyling(profile: ProjectProfile): boolean {
	return (
		profile.styling.includes('tailwind') ||
		profile.styling.includes('nativewind')
	)
}

export function renderBiomeJson(profile: ProjectProfile): string {
	const config = buildBiomeConfig(profile)
	if (hasTailwindStyling(profile)) {
		config.css = { parser: { tailwindDirectives: true } }
	}
	return JSON.stringify(config, null, 2)
}
