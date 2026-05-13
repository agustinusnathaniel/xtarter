import type { ProjectProfile } from '@xtarterize/core'

export function renderOxlintConfig(profile: ProjectProfile): string {
	const rules: Record<string, unknown> = {
		'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
		],
		'@typescript-eslint/consistent-type-imports': [
			'error',
			{ prefer: 'type-imports' },
		],
		'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
		'@typescript-eslint/array-type': ['error', { default: 'generic' }],
		complexity: ['warn', { max: 30 }],
		'max-params': ['error', { max: 3 }],
		eqeqeq: 'error',
		'prefer-const': 'error',
		'no-var': 'error',
		'prefer-template': 'error',
		'no-shadow': 'warn',
		'import/no-duplicates': 'error',
		'import/first': 'error',
		'import/prefer-default-export': 'off',
		'unicorn/no-null': 'off',
		'unicorn/filename-case': 'off',
		'unicorn/no-array-reduce': 'off',
		'unicorn/prevent-abbreviations': 'off',
		'unicorn/no-anonymous-default-export': 'off',
		'unicorn/consistent-function-scoping': 'off',
	}

	if (profile.framework === 'react') {
		Object.assign(rules, {
			'react/jsx-key': [
				'error',
				{
					checkFragmentShorthand: true,
					checkKeyMustBeforeSpread: true,
					warnOnDuplicates: true,
				},
			],
			'react/jsx-boolean-value': 'error',
			'react/self-closing-comp': 'error',
			'react/jsx-no-target-blank': 'error',
			'react/no-unknown-property': 'error',
			'react/no-unescaped-entities': 'error',
			'react/display-name': 'off',
			'jsx-a11y/anchor-is-valid': [
				'error',
				{
					components: ['Link'],
					specialLink: ['hrefLeft', 'hrefRight'],
					aspects: ['invalidHref', 'preferButton'],
				},
			],
			'jsx-a11y/alt-text': 'error',
			'jsx-a11y/click-events-have-key-events': 'warn',
			'jsx-a11y/no-static-element-interactions': 'warn',
		})
	}

	const plugins: string[] = ['eslint', 'typescript', 'unicorn', 'import', 'oxc']
	if (profile.framework === 'react') {
		plugins.push('react', 'jsx-a11y')
	}

	const env: Record<string, boolean> = {
		builtin: true,
	}
	if (profile.runtime === 'browser' || profile.runtime === 'universal') {
		env.browser = true
	}
	if (profile.runtime === 'node' || profile.runtime === 'universal') {
		env.node = true
	}

	const config: Record<string, unknown> = {
		$schema: './node_modules/oxlint/configuration_schema.json',
		plugins,
		env,
		categories: {
			correctness: 'error',
			suspicious: 'warn',
			style: 'warn',
			perf: 'warn',
		},
		rules,
		overrides: [
			{
				files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
				plugins: ['vitest'],
				rules: {
					'no-console': 'off',
					'max-params': 'off',
					'@typescript-eslint/no-explicit-any': 'off',
					'vitest/consistent-test-it': [
						'error',
						{ fn: 'it', withinDescribe: 'test' },
					],
					'vitest/prefer-strict-equal': 'error',
					'vitest/prefer-todo': 'error',
					'vitest/prefer-spy-on': 'error',
					'vitest/prefer-expect-resolves': 'error',
					'vitest/no-disabled-tests': 'warn',
					'vitest/no-focused-tests': 'error',
					'vitest/no-identical-title': 'error',
					'vitest/valid-expect': 'error',
				},
			},
		],
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
