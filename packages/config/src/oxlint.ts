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
export function oxfmtLayer(): { singleQuote: boolean } {
  return { singleQuote: true };
}
