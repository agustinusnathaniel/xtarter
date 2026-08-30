import type { ProjectProfile } from '@xtarterize/core'
import {
	getUltraciteFrameworkPresetSuffix,
	getUltraciteRouterPresetSuffix,
} from './ultracite-presets.js'

function getOxlintEnv(profile: ProjectProfile): Record<string, boolean> {
	const env: Record<string, boolean> = { builtin: true }
	if (profile.runtime === 'browser' || profile.runtime === 'universal') {
		env.browser = true
	}
	if (profile.runtime === 'node' || profile.runtime === 'universal') {
		env.node = true
	}
	return env
}

function getUltracitePresets(profile: ProjectProfile): string[] {
	const presets = ['core']

	const frameworkPreset = getUltraciteFrameworkPresetSuffix(profile)
	if (frameworkPreset) {
		presets.push(frameworkPreset)
	}

	const routerPreset = getUltraciteRouterPresetSuffix(profile)
	if (routerPreset) {
		presets.push(routerPreset)
	}

	return presets
}

export function renderOxlintTsConfig(profile: ProjectProfile): string {
	const presets = getUltracitePresets(profile)

	const importLines = presets.map(
		(p) => `import ${p} from "ultracite/oxlint/${p}"`,
	)

	const extendsArray = presets

	const env = getOxlintEnv(profile)
	const envLine = env.node ? `\n  env: { node: true },` : ''

	// Note: Oxlint's max-lines / max-lines-per-function support skipComments (native ESLint semantics),
	// unlike Biome 2.5.9 which only supports skipBlankLines for noExcessiveLinesPerFunction / noExcessiveLinesPerFile.
	return `import { defineConfig } from "oxlint";
${importLines.join('\n')}

export default defineConfig({
  extends: [${extendsArray.join(', ')}],${envLine}
  rules: {
    "no-console": ["error", { allow: ["info", "warn", "error"] }],
    "no-shadow": "warn",
    "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    {
      files: ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"],
      rules: {
        "no-console": "off",
        "max-lines-per-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
});
`
}

function buildOxlintBaseRules(): Record<string, unknown> {
	// Note: Oxlint supports skipComments for max-lines / max-lines-per-function (ESLint semantics),
	// unlike Biome 2.5.9 which only supports skipBlankLines for the equivalent rules.
	return {
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
		'@typescript-eslint/array-type': ['error', { default: 'generic' }],
		complexity: ['warn', { max: 30 }],
		'max-params': ['error', { max: 3 }],
		'max-lines': [
			'error',
			{ max: 500, skipBlankLines: true, skipComments: true },
		],
		'max-lines-per-function': [
			'error',
			{ max: 60, skipBlankLines: true, skipComments: true },
		],
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
}

function buildOxlintReactRules(): Record<string, unknown> {
	return {
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
	}
}

function buildOxlintRules(profile: ProjectProfile): Record<string, unknown> {
	const rules = buildOxlintBaseRules()
	if (profile.framework === 'react') {
		Object.assign(rules, buildOxlintReactRules())
	}
	return rules
}

function buildOxlintPlugins(profile: ProjectProfile): string[] {
	const plugins: string[] = ['eslint', 'typescript', 'unicorn', 'import', 'oxc']
	if (profile.framework === 'react') {
		plugins.push('react', 'jsx-a11y')
	}
	return plugins
}

function buildOxlintOverrides(): Array<Record<string, unknown>> {
	return [
		{
			files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
			plugins: ['vitest'],
			rules: {
				'no-console': 'off',
				'max-params': 'off',
				'max-lines-per-function': 'off',
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
	]
}

function buildOxlintConfig(profile: ProjectProfile): Record<string, unknown> {
	const env = getOxlintEnv(profile)
	return {
		$schema: './node_modules/oxlint/configuration_schema.json',
		plugins: buildOxlintPlugins(profile),
		env,
		categories: {
			correctness: 'error',
			suspicious: 'warn',
			style: 'warn',
			perf: 'warn',
		},
		rules: buildOxlintRules(profile),
		overrides: buildOxlintOverrides(),
	}
}

export function renderOxlintJsonConfig(profile: ProjectProfile): string {
	const config = buildOxlintConfig(profile)
	return JSON.stringify(config, null, 2)
}
