import { isDeepStrictEqual } from 'node:util';

import { defineTask, type TargetPolicy } from '@/factory/define-task.js';

import { getCompilerOptions } from './utils.js';

const EXPECTED_OPTIONS = {
  noUnusedLocals: true,
  noUnusedParameters: true,
  strict: true,
  verbatimModuleSyntax: true,
} as const;

function getCompilerOption(content: string, key: string): unknown {
  const options = getCompilerOptions(content);
  if (!options) {
    return undefined;
  }
  if (!Object.hasOwn(options, key)) {
    return undefined;
  }
  return options[key];
}

/**
 * ADR 008 tristate: a missing option projects `patch`, a matching option
 * `skip`, and an option the project explicitly sets to another value projects
 * `conflict`. Conflict wins over missing so an explicit override is reported.
 */
const strictPolicy: TargetPolicy = ({ before }) => {
  if (before === null) {
    return;
  }

  let hasMissing = false;
  let hasConflict = false;

  for (const [key, value] of Object.entries(EXPECTED_OPTIONS)) {
    const actual = getCompilerOption(before, key);
    if (actual === undefined) {
      hasMissing = true;
    } else if (!isDeepStrictEqual(actual, value)) {
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
};

export const strictTask = defineTask({
  applicable: (profile) => profile.typescript,
  group: 'TypeScript',
  id: 'ts/strict',
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
  label: 'tsconfig - strict compiler options',
  tags: [
    'typescript',
    'strict',
    'no-unused-locals',
    'no-unused-parameters',
    'verbatim-module-syntax',
    'type-checking',
    'quality',
  ],
  targets: [
    {
      filepath: 'tsconfig.json',
      incoming: () => ({
        compilerOptions: { ...EXPECTED_OPTIONS },
      }),
      kind: 'jsonMerge',
      policy: strictPolicy,
    },
  ],
});
