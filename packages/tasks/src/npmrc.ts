import { defineTask } from '@/factory/define-task.js';

function npmrcContent(): string {
  return [
    'save-exact=true',
    'strict-peer-dependencies=true',
    'auto-install-peers=true',
    '',
  ].join('\n');
}

export const npmrcTask = defineTask({
  applicable: () => true,
  group: 'Scripts',
  id: 'scripts/npmrc',
  label: '.npmrc - package manager config',
  scope: 'root',
  searchMeta: {
    keywords: [
      'npmrc',
      'npm config',
      'registry',
      'package manager',
      'settings',
    ],
    tags: ['package-manager', 'config', 'registry'],
  },
  targets: [
    {
      filepath: '.npmrc',
      kind: 'text',
      render: () => npmrcContent(),
    },
  ],
});
