import { defineTask } from '@/factory/define-task.js';

export const versionrcTask = defineTask({
  applicable: () => true,
  group: 'Release',
  id: 'release/versionrc',
  label: '.versionrc.json - changelog configuration',
  scope: 'root',
  searchMeta: {
    keywords: [
      'versionrc',
      'changelog',
      'release',
      'conventional commits',
      'standard-version',
      'commit-and-tag-version',
    ],
    tags: ['release', 'version', 'changelog', 'semver', 'conventional-commits'],
  },
  targets: [
    {
      filepath: '.versionrc.json',
      incoming: () => ({
        bumpFiles: ['package.json'],
        types: [
          { section: 'Features', type: 'feat' },
          { section: 'Bug Fixes', type: 'fix' },
          { section: 'Code Refactoring', type: 'refactor' },
          { section: 'Performance Improvements', type: 'perf' },
          { hidden: true, section: 'Documentation', type: 'docs' },
          { hidden: true, section: 'Styles', type: 'style' },
          { hidden: true, section: 'Tests', type: 'test' },
          { hidden: true, section: 'Chores', type: 'chore' },
          { hidden: true, section: 'CI/CD', type: 'ci' },
          { hidden: true, section: 'Build System', type: 'build' },
          { hidden: true, section: 'Reverts', type: 'revert' },
        ],
      }),
      kind: 'jsonMerge',
    },
  ],
});
