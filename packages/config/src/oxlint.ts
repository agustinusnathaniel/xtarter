import type { OxfmtConfig } from 'oxfmt';

/**
 * The xtarter layer for Oxlint: the rules xtarter adds on top of Ultracite's
 * core preset. Environment settings depend on a project's runtime and stay in
 * its own config.
 */
export interface OxlintLayer {
  overrides: Array<{ files: Array<string>; rules: Record<string, unknown> }>;
  rules: Record<string, unknown>;
}

/** Returns a fresh copy so callers can extend it without sharing state. */
export function oxlintCoreLayer(): OxlintLayer {
  return {
    overrides: [
      {
        files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          'max-lines-per-function': 'off',
          'no-console': 'off',
        },
      },
    ],
    rules: {
      curly: ['error', 'all'],
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'error',
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-shadow': 'warn',
    },
  };
}

/** The xtarter layer for Oxfmt, spread over Ultracite's Oxfmt options. */
export interface OxfmtLayer {
  singleQuote: boolean;
  sortImports: {
    groups: Array<string | Array<string> | { newlinesBetween: boolean }>;
    ignoreCase: boolean;
    internalPattern: Array<string>;
    newlinesBetween: boolean;
    order: 'asc' | 'desc';
  };
}

/**
 * The same import groups as Biome's `organizeImports` in the Biome layer:
 * built-ins then packages with no blank line between them, a blank line,
 * aliases, a blank line, relative paths. `internalPattern` lists the prefixes Biome's `:ALIAS:`
 * matches. The spread replaces Ultracite's whole `sortImports` object, so its
 * `ignoreCase`, `newlinesBetween`, and `order` are repeated here.
 */
const sortImports = {
  groups: [
    'builtin',
    { newlinesBetween: false },
    'external',
    ['internal', 'subpath'],
    ['parent', 'sibling', 'index'],
    'unknown',
  ],
  ignoreCase: true,
  internalPattern: ['@/', '#', '~', '$', '%'],
  newlinesBetween: true,
  order: 'asc',
} satisfies OxfmtLayer['sortImports'] & OxfmtConfig['sortImports'];

export function oxfmtLayer(): OxfmtLayer {
  return { singleQuote: true, sortImports };
}
