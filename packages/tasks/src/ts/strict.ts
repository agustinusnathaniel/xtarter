import { deepEqual } from '@xtarterize/core';

import { createJsonMergeTask } from '@/factory';

import { getCompilerOptions } from './utils.js';

const EXPECTED_OPTIONS = {
  noUnusedLocals: true,
  noUnusedParameters: true,
  strict: true,
  verbatimModuleSyntax: true,
} as const;

function getCompilerOption(content: string | null, key: string): unknown {
  const options = getCompilerOptions(content);
  if (!options) {
    return undefined;
  }
  if (!Object.hasOwn(options, key)) {
    return undefined;
  }
  return options[key];
}

export const strictTask = createJsonMergeTask({
  applicable: (profile) => profile.typescript,
  checkFn: async ({ fullPath, content }) => {
    if (!(fullPath && content)) {
      return 'new';
    }

    let hasMissing = false;
    let hasConflict = false;

    for (const [key, value] of Object.entries(EXPECTED_OPTIONS)) {
      const actual = getCompilerOption(content, key);
      if (actual === undefined) {
        hasMissing = true;
      } else if (!deepEqual(actual, value)) {
        hasConflict = true;
      }
    }

    if (hasConflict) {
      return 'conflict';
    }
    if (hasMissing) {
      return 'patch';
    }
    return 'skip';
  },
  filepath: 'tsconfig.json',
  group: 'TypeScript',
  id: 'ts/strict',
  incoming: () => ({
    compilerOptions: { ...EXPECTED_OPTIONS },
  }),
  label: 'tsconfig - strict compiler options',
  searchMeta: {
    configTargets: ['tsconfig.json'],
    keywords: [
      'strict',
      'typescript strict',
      'noUnusedLocals',
      'noUnusedParameters',
      'verbatimModuleSyntax',
      'type checking',
      'strict mode',
      'type safety',
    ],
    tags: [
      'typescript',
      'strict',
      'no-unused-locals',
      'no-unused-parameters',
      'verbatim-module-syntax',
      'type-checking',
      'quality',
    ],
  },
});
