import type { ProjectProfile } from '@xtarterize/core';

import {
  getUltraciteFrameworkPresetSuffix,
  getUltraciteRouterPresetSuffix,
} from './ultracite-presets.js';

function getUltraciteExtends(profile: ProjectProfile): Array<string> {
  const presets = ['ultracite/biome/core'];

  const frameworkPreset = getUltraciteFrameworkPresetSuffix(profile);
  if (frameworkPreset) {
    presets.push(`ultracite/biome/${frameworkPreset}`);
  }

  const routerPreset = getUltraciteRouterPresetSuffix(profile);
  if (routerPreset) {
    presets.push(`ultracite/biome/${routerPreset}`);
  }

  return presets;
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
  };
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
      noExcessiveLinesPerFile: {
        level: 'error',
        options: {
          maxLines: 500,
          skipBlankLines: true,
        },
      },
      useBlockStatements: 'error',
      useConsistentArrayType: {
        level: 'error',
        options: { syntax: 'generic' },
      },
      useConsistentTypeDefinitions: 'off',
      useFilenamingConvention: {
        level: 'error',
        options: { filenameCases: ['kebab-case'] },
      },
    },
  };
}

function buildBiomeAssistConfig(): Record<string, unknown> {
  return {
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
    enabled: true,
  };
}

function buildBiomeOverrides(): Array<Record<string, unknown>> {
  return [
    {
      includes: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      linter: {
        rules: {
          complexity: {
            noExcessiveLinesPerFunction: 'off',
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
  ];
}

function buildBiomeConfig(profile: ProjectProfile): Record<string, unknown> {
  return {
    $schema: './node_modules/@biomejs/biome/configuration_schema.json',
    assist: buildBiomeAssistConfig(),
    extends: getUltraciteExtends(profile),
    files: buildBiomeFilesConfig(),
    formatter: { enabled: true, indentStyle: 'space' },
    javascript: { formatter: { quoteStyle: 'single' } },
    linter: {
      enabled: true,
      rules: buildBiomeLinterRules(),
    },
    overrides: buildBiomeOverrides(),
    vcs: { clientKind: 'git', enabled: true, useIgnoreFile: true },
  };
}

function hasTailwindStyling(profile: ProjectProfile): boolean {
  return (
    profile.styling.includes('tailwind') ||
    profile.styling.includes('nativewind')
  );
}

export function renderBiomeJson(profile: ProjectProfile): string {
  const config = buildBiomeConfig(profile);
  if (hasTailwindStyling(profile)) {
    config.css = { parser: { tailwindDirectives: true } };
  }
  return JSON.stringify(config, null, 2);
}
