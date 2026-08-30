import { createFileTask } from '@/factory';
import { renderCommitlintConfig } from '@/templates/commitlint-config.js';

export const commitlintTask = createFileTask({
  applicable: () => true,
  checkFn: async ({ fullPath, content }) => {
    if (!(fullPath && content)) {
      return 'new';
    }
    // Check if the config already extends @commitlint/config-conventional
    const hasExtends = /['"]@commitlint\/config-conventional['"]/.test(content);
    return hasExtends ? 'skip' : 'conflict';
  },
  extensions: ['.ts', '.js', '.mjs', '.mts', '.cts'],
  filepath: 'commitlint.config',
  group: 'Release',
  id: 'release/commitlint',
  label: 'Commitlint config',
  render: (profile, _existing) => renderCommitlintConfig(profile),
  scope: 'root',
  searchMeta: {
    configTargets: ['commitlint.config.ts'],
    keywords: [
      'commitlint',
      'commit message',
      'conventional commits',
      'lint commit',
    ],
    tags: ['commit', 'linting', 'conventional-commits'],
  },
});
