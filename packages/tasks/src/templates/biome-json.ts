import type { ProjectProfile } from '@xtarterize/core'
import type { Configuration } from './_biome-config.generated.js'

export function renderBiomeJson(profile: ProjectProfile): string {
	const hasTailwind =
		profile.styling.includes('tailwind') ||
		profile.styling.includes('nativewind')

	const config: Configuration = {
		$schema: './node_modules/@biomejs/biome/configuration_schema.json',
		vcs: { enabled: true, clientKind: 'git', useIgnoreFile: true },
		files: {
			includes: [
				'src/**/*',
				'*.config.ts',
				'!**/*.css',
				'!**/*.d.ts',
				'!.agents',
				'!.claude',
			],
		},
		formatter: { indentStyle: 'space' },
		linter: {
			rules: {
				complexity: {
					noExcessiveCognitiveComplexity: {
						level: 'warn',
						options: { maxAllowedComplexity: 30 },
					},
					useMaxParams: {
						level: 'error',
						options: { max: 3 },
					},
				},
				style: {
					useConsistentArrayType: {
						level: 'error',
						options: { syntax: 'generic' },
					},
					useConsistentTypeDefinitions: {
						level: 'error',
						options: { style: 'type' },
					},
				},
			},
		},
		javascript: { formatter: { quoteStyle: 'single' } },
		assist: {
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
						complexity: {
							noExcessiveCognitiveComplexity: 'off',
						},
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
