import { createFileTask } from '@/factory';

function npmrcContent(): string {
  return [
    'save-exact=true',
    'strict-peer-dependencies=true',
    'auto-install-peers=true',
    '',
  ].join('\n');
}

export const npmrcTask = createFileTask({
  applicable: () => true,
  filepath: '.npmrc',
  group: 'Scripts',
  id: 'scripts/npmrc',
  label: '.npmrc - package manager config',
  render: () => npmrcContent(),
  scope: 'root',
  searchMeta: {
    configTargets: ['.npmrc'],
    keywords: [
      'npmrc',
      'npm config',
      'registry',
      'package manager',
      'settings',
    ],
    tags: ['package-manager', 'config', 'registry'],
  },
});
