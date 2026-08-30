import type { ProjectProfile } from '@xtarterize/core';

import {
  getUltraciteFrameworkPresetSuffix,
  getUltraciteRouterPresetSuffix,
} from './ultracite-presets.js';

function getOxlintEnv(profile: ProjectProfile): Record<string, boolean> {
  const env: Record<string, boolean> = { builtin: true };
  if (profile.runtime === 'browser' || profile.runtime === 'universal') {
    env.browser = true;
  }
  if (profile.runtime === 'node' || profile.runtime === 'universal') {
    env.node = true;
  }
  return env;
}

function getUltracitePresets(profile: ProjectProfile): Array<string> {
  const presets = ['core'];

  const frameworkPreset = getUltraciteFrameworkPresetSuffix(profile);
  if (frameworkPreset) {
    presets.push(frameworkPreset);
  }

  const routerPreset = getUltraciteRouterPresetSuffix(profile);
  if (routerPreset) {
    presets.push(routerPreset);
  }

  return presets;
}

export function renderOxlintTsConfig(profile: ProjectProfile): string {
  const presets = getUltracitePresets(profile);

  const importLines = presets.map(
    (p) => `import ${p} from "ultracite/oxlint/${p}"`
  );

  const extendsArray = presets;

  const env = getOxlintEnv(profile);
  const envLine = env.node ? '\n  env: { node: true },' : '';

  // Biome 2.5.9: only skipBlankLines is supported (skipComments not in schema); Oxlint supports both
  return `import { defineConfig } from "oxlint";
${importLines.join('\n')}

export default defineConfig({
  extends: [${extendsArray.join(', ')}],${envLine}
  rules: {
    "no-console": ["error", { allow: ["info", "warn", "error"] }],
    "no-shadow": "warn",
    curly: ["error", "all"],
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
`;
}

function buildOxlintBaseRules(): Record<string, unknown> {
  // Biome 2.5.9: only skipBlankLines is supported (skipComments not in schema); Oxlint supports both
  return {
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    complexity: ['warn', { max: 30 }],
    curly: ['error', 'all'],
    eqeqeq: 'error',
    'import/first': 'error',
    'import/no-duplicates': 'error',
    'import/prefer-default-export': 'off',
    'max-lines': [
      'error',
      { max: 500, skipBlankLines: true, skipComments: true },
    ],
    'max-lines-per-function': [
      'error',
      { max: 60, skipBlankLines: true, skipComments: true },
    ],
    'max-params': ['error', { max: 3 }],
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
    'no-shadow': 'warn',
    'no-unused-vars': 'off',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'unicorn/consistent-function-scoping': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/no-anonymous-default-export': 'off',
    'unicorn/no-array-reduce': 'off',
    'unicorn/no-null': 'off',
    'unicorn/prevent-abbreviations': 'off',
  };
}

function buildOxlintReactRules(): Record<string, unknown> {
  return {
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        aspects: ['invalidHref', 'preferButton'],
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
      },
    ],
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'react/display-name': 'off',
    'react/jsx-boolean-value': 'error',
    'react/jsx-key': [
      'error',
      {
        checkFragmentShorthand: true,
        checkKeyMustBeforeSpread: true,
        warnOnDuplicates: true,
      },
    ],
    'react/jsx-no-target-blank': 'error',
    'react/no-unescaped-entities': 'error',
    'react/no-unknown-property': 'error',
    'react/self-closing-comp': 'error',
  };
}

function buildOxlintRules(profile: ProjectProfile): Record<string, unknown> {
  const rules = buildOxlintBaseRules();
  if (profile.framework === 'react') {
    Object.assign(rules, buildOxlintReactRules());
  }
  return rules;
}

function buildOxlintPlugins(profile: ProjectProfile): Array<string> {
  const plugins: Array<string> = [
    'eslint',
    'typescript',
    'unicorn',
    'import',
    'oxc',
  ];
  if (profile.framework === 'react') {
    plugins.push('react', 'jsx-a11y');
  }
  return plugins;
}

function buildOxlintOverrides(): Array<Record<string, unknown>> {
  return [
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      plugins: ['vitest'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines-per-function': 'off',
        'max-params': 'off',
        'no-console': 'off',
        'vitest/consistent-test-it': [
          'error',
          { fn: 'it', withinDescribe: 'test' },
        ],
        'vitest/no-disabled-tests': 'warn',
        'vitest/no-focused-tests': 'error',
        'vitest/no-identical-title': 'error',
        'vitest/prefer-expect-resolves': 'error',
        'vitest/prefer-spy-on': 'error',
        'vitest/prefer-strict-equal': 'error',
        'vitest/prefer-todo': 'error',
        'vitest/valid-expect': 'error',
      },
    },
  ];
}

function buildOxlintConfig(profile: ProjectProfile): Record<string, unknown> {
  const env = getOxlintEnv(profile);
  return {
    $schema: './node_modules/oxlint/configuration_schema.json',
    categories: {
      correctness: 'error',
      perf: 'warn',
      style: 'warn',
      suspicious: 'warn',
    },
    env,
    overrides: buildOxlintOverrides(),
    plugins: buildOxlintPlugins(profile),
    rules: buildOxlintRules(profile),
  };
}

export function renderOxlintJsonConfig(profile: ProjectProfile): string {
  const config = buildOxlintConfig(profile);
  return JSON.stringify(config, null, 2);
}
