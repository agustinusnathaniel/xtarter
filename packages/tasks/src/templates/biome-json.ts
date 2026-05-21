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

export function renderBiomeJson(profile: ProjectProfile): string {
	const hasTailwind =
		profile.styling.includes('tailwind') ||
		profile.styling.includes('nativewind')

	const config: Record<string, unknown> = {
		$schema: './node_modules/@biomejs/biome/configuration_schema.json',
		vcs: { enabled: true, clientKind: 'git', useIgnoreFile: true },
		extends: getUltraciteExtends(profile),
		files: {
			ignoreUnknown: false,
			includes: [
				'src/**/*',
				'*.config.ts',
				'!**/*.css',
				'!**/*.d.ts',
				'!.agents',
				'!.claude',
			],
		},
		formatter: { enabled: true, indentStyle: 'space' },
		linter: {
			enabled: true,
			rules: {
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
				},
			},
		},
		javascript: { formatter: { quoteStyle: 'single' } },
		assist: {
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
		},
		overrides: [
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
					},
				},
			},
		],
	}

	if (hasTailwind) {
		config.css = { parser: { tailwindDirectives: true } }
	}

	return JSON.stringify(config, null, 2)
}
