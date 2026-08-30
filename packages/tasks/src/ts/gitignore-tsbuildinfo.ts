import { createFileTask } from '@/factory';

const ENTRIES = ['*.tsbuildinfo', '.tsbuildinfo/'];

export const gitignoreTsbuildinfoTask = createFileTask({
  applicable: (profile) => profile.typescript,
  checkFn: async ({ content }) => {
    if (!content) {
      return 'new';
    }
    const allPresent = ENTRIES.every((entry) => content.includes(entry));
    return allPresent ? 'skip' : 'patch';
  },
  filepath: '.gitignore',
  group: 'TypeScript',
  id: 'gitignore/tsbuildinfo',
  label: '.gitignore - tsbuildinfo',
  render: (_profile, existing) => {
    const missing = ENTRIES.filter((entry) => !existing?.includes(entry));
    if (missing.length === 0) {
      return existing ?? '';
    }
    const header = '# TypeScript incremental build info';
    if (!existing) {
      return `${header}\n${missing.map((e) => e).join('\n')}\n`;
    }
    return `${existing.replace(/\n*$/, '')}\n\n${header}\n${missing.map((e) => e).join('\n')}\n`;
  },
  scope: 'root',
  searchMeta: {
    configTargets: ['.gitignore'],
    keywords: [
      'tsbuildinfo',
      'gitignore',
      'typescript build',
      'declaration files',
    ],
    tags: ['typescript', 'gitignore', 'build-output'],
  },
});
