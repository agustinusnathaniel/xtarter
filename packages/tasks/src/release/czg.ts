import { createPackageJsonTask } from '@/factory';

export const czgTask = createPackageJsonTask({
  applicable: () => true,
  depName: 'czg',
  group: 'Release',
  id: 'release/czg',
  installDev: true,
  label: 'czg (commitizen)',
  scope: 'root',
  scripts: [{ script: 'commit', value: 'czg' }],
  searchMeta: {
    configTargets: ['package.json'],
    keywords: [
      'czg',
      'commitizen',
      'commit',
      'conventional commits',
      'interactive',
    ],
    tags: ['commit', 'cli', 'conventional-commits', 'interactive'],
  },
});
