import type { ProjectProfile } from '@xtarterize/core'

export function renderOxlintConfig(profile: ProjectProfile): string {
	const config: Record<string, unknown> = {
		$schema: './node_modules/oxlint/configuration_schema.json',
		rules: {
			'no-console': 'error',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' },
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports' },
			],
			complexity: 'warn',
		},
	}

	if (profile.framework === 'react') {
		;(config.rules as Record<string, unknown>)['jsx-a11y/anchor-is-valid'] = [
			'error',
			{
				components: ['Link'],
				specialLink: ['hrefLeft', 'hrefRight'],
				aspects: ['invalidHref', 'preferButton'],
			},
		]
	}

	return JSON.stringify(config, null, 2)
}

export function renderOxfmtConfig(_profile: ProjectProfile): string {
	const config = {
		$schema: './node_modules/oxfmt/configuration_schema.json',
		indentStyle: 'space',
		indentWidth: 2,
		lineWidth: 80,
		quotes: 'single',
		semicolons: true,
		trailingComma: 'all',
	}

	return JSON.stringify(config, null, 2)
}
