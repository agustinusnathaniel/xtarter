/**
 * The xtarter layer for Biome: the settings xtarter adds on top of Ultracite's
 * core preset. Only portable settings live here; file includes, VCS, and CSS
 * parser options depend on a project's layout and stay in its own config.
 */

// Only skipBlankLines is supported (skipComments is not in Biome's schema).
const linterRules = {
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

const assist = {
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

const overrides = [
  {
    includes: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
    linter: {
      rules: {
        style: {
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

export interface BiomeLayer {
  assist: typeof assist;
  formatter: { enabled: boolean; indentStyle: string };
  javascript: { formatter: { quoteStyle: string } };
  linter: { enabled: boolean; rules: typeof linterRules };
  overrides: typeof overrides;
}

/** Returns a fresh copy so callers can extend it without sharing state. */
export function biomeCoreLayer(): BiomeLayer {
  return structuredClone({
    assist,
    formatter: { enabled: true, indentStyle: 'space' },
    javascript: { formatter: { quoteStyle: 'single' } },
    linter: { enabled: true, rules: linterRules },
    overrides,
  });
}
