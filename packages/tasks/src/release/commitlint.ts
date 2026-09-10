import { defineTask, type TargetPolicy } from '@/factory/define-task.js';
import { renderCommitlintConfig } from '@/templates/commitlint-config.js';

const CONFIG_CONVENTIONAL_EXTENDS = /['"]@commitlint\/config-conventional['"]/;

const commitlintPolicy: TargetPolicy = ({ before }) => {
  if (before === null) {
    return;
  }
  return CONFIG_CONVENTIONAL_EXTENDS.test(before) ? 'skip' : 'conflict';
};

export const commitlintTask = defineTask({
  applicable: () => true,
  group: 'Release',
  id: 'release/commitlint',
  label: 'Commitlint config',
  scope: 'root',
  searchMeta: {
    keywords: [
      'commitlint',
      'commit message',
      'conventional commits',
      'lint commit',
    ],
    tags: ['commit', 'linting', 'conventional-commits'],
  },
  targets: [
    {
      extensions: ['.ts', '.js', '.mjs', '.mts', '.cts'],
      filepath: 'commitlint.config',
      kind: 'text',
      policy: commitlintPolicy,
      render: (profile) => renderCommitlintConfig(profile),
    },
  ],
});
