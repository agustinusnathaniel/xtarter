import { createJsonMergeTask } from '@/factory';

export const versionrcTask = createJsonMergeTask({
  applicable: () => true,
  filepath: '.versionrc.json',
  group: 'Release',
  id: 'release/versionrc',
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
  label: '.versionrc.json - changelog configuration',
  scope: 'root',
  searchMeta: {
    configTargets: ['.versionrc.json'],
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
});
