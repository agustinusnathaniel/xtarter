import {
  defineSingleTargetTask,
  type TargetPolicy,
} from '@/factory/define-task.js';

const ENTRIES = ['*.tsbuildinfo', '.tsbuildinfo/'];

const gitignoreTsbuildinfoPolicy: TargetPolicy = ({ before }) => {
  if (before === null) {
    return;
  }
  const allPresent = ENTRIES.every((entry) => before.includes(entry));
  return allPresent ? undefined : 'patch';
};

export const gitignoreTsbuildinfoTask = defineSingleTargetTask({
  applicable: (profile) => profile.typescript,
  group: 'TypeScript',
  id: 'gitignore/tsbuildinfo',
  label: '.gitignore - tsbuildinfo',
  scope: 'root',
  searchMeta: {
    keywords: [
      'tsbuildinfo',
      'gitignore',
      'typescript build',
      'declaration files',
    ],
    tags: ['typescript', 'gitignore', 'build-output'],
  },
  target: {
    filepath: '.gitignore',
    kind: 'text',
    policy: gitignoreTsbuildinfoPolicy,
    render: (_profile, existing) => {
      const missing = ENTRIES.filter((entry) => !existing?.includes(entry));
      if (missing.length === 0) {
        return existing ?? '';
      }
      const header = '# TypeScript incremental build info';
      if (!existing) {
        return `${header}\n${missing.join('\n')}\n`;
      }
      return `${existing.replace(/\n*$/, '')}\n\n${header}\n${missing.join('\n')}\n`;
    },
  },
});
