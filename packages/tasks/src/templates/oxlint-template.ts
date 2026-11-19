import { oxlintCoreLayer, sharedConfigEntry } from '@xtarter/config';
import type { ProjectProfile } from '@xtarterize/core';
import type { ConfigArrayImport } from '@xtarterize/patchers';

import type { LintConfigForm } from '@/lint/config-form.js';
import type { VitePlusBlock } from '@/templates/oxfmt-template.js';
import { collectUltracitePresets } from '@/templates/ultracite-presets.js';

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

/** Indent a JSON rendering so it nests as a property value at depth one. */
function nestJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replaceAll('\n', '\n  ');
}

function renderEnvLine(profile: ProjectProfile): string {
  return getOxlintEnv(profile).node ? '\n  env: { node: true },' : '';
}

/** Binding name for a preset import, such as `reactNative` for `react-native`. */
function presetBinding(preset: string): string {
  return preset.replace(/-(?<letter>[a-z])/gu, (_match, letter: string) =>
    letter.toUpperCase()
  );
}

/**
 * The opt-in Ultracite layer xtarterize adds only when it writes a new Oxlint
 * config (ADR-046). Upkeep of an existing config never adds it, so projects
 * set up earlier keep the rules they had.
 */
export const NEW_CONFIG_OXLINT_PRESET = 'landmines';

/** The package the landmines layer loads its JS plugins from. */
export const LANDMINES_PACKAGE = '@interfere/landmines';

/** The presets a new Oxlint config extends: the detected layers, then landmines. */
function newConfigPresets(profile: ProjectProfile): Array<string> {
  return [...collectUltracitePresets(profile), NEW_CONFIG_OXLINT_PRESET];
}

/**
 * Repeats the landmines plugins at the root, where Knip looks for them, so it
 * does not report the plugin package as unused.
 */
function jsPluginsLine(binding: string): string {
  return `\n  jsPlugins: ${binding}.jsPlugins,`;
}

/** The full config: Ultracite presets plus the xtarter layer written inline. */
export function renderOxlintTsConfig(profile: ProjectProfile): string {
  const presets = newConfigPresets(profile);
  const layer = oxlintCoreLayer();

  const importLines = presets.map(
    (p) => `import ${presetBinding(p)} from "ultracite/oxlint/${p}";`
  );

  return `import { defineConfig } from "oxlint";
${importLines.join('\n')}

export default defineConfig({
  extends: [${presets.map(presetBinding).join(', ')}],${renderEnvLine(profile)}${jsPluginsLine(presetBinding(NEW_CONFIG_OXLINT_PRESET))}
  rules: ${nestJson(layer.rules)},
  overrides: ${nestJson(layer.overrides)},
});
`;
}

/** Prefix a binding, such as `xtarter` and `react-native` to `xtarterReactNative`. */
function prefixedBinding(prefix: string, preset: string): string {
  const binding = presetBinding(preset);
  return prefix === ''
    ? binding
    : `${prefix}${binding.charAt(0).toUpperCase()}${binding.slice(1)}`;
}

/**
 * The shared imports a managed Oxlint config extends, core first. A prefix
 * keeps the bindings apart from other imports in a shared file.
 */
export function managedOxlintImports(
  profile: ProjectProfile,
  prefix = ''
): Array<ConfigArrayImport> {
  return collectUltracitePresets(profile).map((preset) => ({
    from: sharedConfigEntry('oxlint', preset),
    local: prefixedBinding(prefix, preset),
  }));
}

/** The shared imports a new managed Oxlint config extends: detected layers, then landmines. */
function newManagedOxlintImports(
  profile: ProjectProfile,
  prefix = ''
): Array<ConfigArrayImport> {
  return newConfigPresets(profile).map((preset) => ({
    from: sharedConfigEntry('oxlint', preset),
    local: prefixedBinding(prefix, preset),
  }));
}

/** The Ultracite presets a new ejected Oxlint config extends, core first. */
function ejectedOxlintImports(
  profile: ProjectProfile,
  prefix: string
): Array<ConfigArrayImport> {
  return newConfigPresets(profile).map((preset) => ({
    from: `ultracite/oxlint/${preset}`,
    local: prefixedBinding(prefix, preset),
  }));
}

/** Binding prefix for the shared layers in a Vite+ `vite.config` lint block. */
export const VITE_PLUS_LINT_PREFIX = 'xtarter';

/**
 * The `lint` block of a Vite+ `vite.config`, which is where `vp lint` and
 * `vp check` read Oxlint settings.
 */
export function vitePlusLintBlock(
  profile: ProjectProfile,
  form: LintConfigForm
): VitePlusBlock {
  if (form === 'managed') {
    const imports = newManagedOxlintImports(profile, VITE_PLUS_LINT_PREFIX);
    const landmines = prefixedBinding(
      VITE_PLUS_LINT_PREFIX,
      NEW_CONFIG_OXLINT_PRESET
    );
    return {
      expression: `{${renderEnvLine(profile)}\n  extends: [${imports.map(({ local }) => local).join(', ')}],${jsPluginsLine(landmines)}\n}`,
      imports,
    };
  }
  const imports = ejectedOxlintImports(profile, 'ultracite');
  const landmines = prefixedBinding('ultracite', NEW_CONFIG_OXLINT_PRESET);
  const layer = oxlintCoreLayer();
  return {
    expression: `{${renderEnvLine(profile)}
  extends: [${imports.map(({ local }) => local).join(', ')}],${jsPluginsLine(landmines)}
  overrides: ${nestJson(layer.overrides)},
  rules: ${nestJson(layer.rules)},
}`,
    imports,
  };
}

/** A short config extending `@xtarter/config`, plus the project's runtime env. */
export function renderManagedOxlintTsConfig(profile: ProjectProfile): string {
  const imports = newManagedOxlintImports(profile);
  const importLines = imports.map(
    ({ from, local }) => `import ${local} from "${from}";`
  );

  return `import { defineConfig } from "oxlint";
${importLines.join('\n')}

export default defineConfig({
  extends: [${imports.map(({ local }) => local).join(', ')}],${renderEnvLine(profile)}${jsPluginsLine(presetBinding(NEW_CONFIG_OXLINT_PRESET))}
});
`;
}

function buildOxlintBaseRules(): Record<string, unknown> {
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
