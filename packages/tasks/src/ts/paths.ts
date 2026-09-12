import type { ProjectProfile } from '@xtarterize/core';

import { defineTask, type TargetPolicy } from '@/factory/define-task.js';

import { getCompilerOptions } from './utils.js';

function getPathStatus(
  content: string | null,
  profile: ProjectProfile
): 'missing' | 'match' | 'mismatch' {
  const options = getCompilerOptions(content);
  if (!options) {
    return 'missing';
  }
  const paths = options.paths;
  if (typeof paths !== 'object' || paths === null || Array.isArray(paths)) {
    return 'missing';
  }
  const alias = (paths as Record<string, unknown>)['@/*'];
  const validTargets =
    profile.bundler === 'nextjs' ? ['./*', './src/*'] : ['./src/*'];
  const hasValidAlias =
    Array.isArray(alias) &&
    alias.some((entry) => validTargets.includes(entry as string));

  if (profile.bundler === 'nextjs') {
    return hasValidAlias ? 'match' : 'mismatch';
  }

  if (!hasValidAlias) {
    return 'mismatch';
  }
  if (options.baseUrl !== '.') {
    return 'mismatch';
  }
  return 'match';
}

/**
 * ADR 008 tristate: a missing alias projects `patch`, a valid alias (plus
 * `baseUrl: "."` outside Next) projects `skip`, and anything else projects
 * `conflict` so an existing alias is never silently overwritten.
 */
const pathsPolicy: TargetPolicy = ({ before }, { profile }) => {
  if (before === null) {
    return;
  }
  const status = getPathStatus(before, profile);
  if (status === 'match') {
    return 'skip';
  }
  if (status === 'missing') {
    return 'patch';
  }
  return 'conflict';
};

export const pathsTask = defineTask({
  applicable: (profile) => profile.typescript,
  group: 'TypeScript',
  id: 'ts/paths',
  keywords: [
    'path aliases',
    'import paths',
    '@ alias',
    'module resolution',
    'tsconfig',
  ],
  label: 'tsconfig - path aliases',
  scope: 'package',
  tags: ['typescript', 'paths', 'aliases', 'imports'],
  targets: [
    {
      filepath: 'tsconfig.json',
      incoming: (_cwd, profile) => ({
        compilerOptions: {
          ...(profile.bundler === 'nextjs' ? {} : { baseUrl: '.' }),
          paths: {
            '@/*': [profile.bundler === 'nextjs' ? './*' : './src/*'],
          },
        },
      }),
      kind: 'jsonMerge',
      policy: pathsPolicy,
    },
  ],
});
