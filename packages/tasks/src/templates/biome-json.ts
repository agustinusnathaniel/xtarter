import type { ProjectProfile } from '@xtarterize/core'

export function renderBiomeJson(profile: ProjectProfile): string {
	const hasTailwind =
		profile.styling.includes('tailwind') ||
		profile.styling.includes('nativewind')

	const config: Record<string, unknown> = {
		$schema: './node_modules/@biomejs/biome/configuration_schema.json',
		vcs: { enabled: true, clientKind: 'git', useIgnoreFile: true },
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
				recommended: true,
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
