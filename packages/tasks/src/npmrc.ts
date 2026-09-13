import { defineSingleTargetTask } from '@/factory/define-task.js';

function npmrcContent(): string {
  return [
    'save-exact=true',
    'strict-peer-dependencies=true',
    'auto-install-peers=true',
    '',
  ].join('\n');
}

export const npmrcTask = defineSingleTargetTask({
  applicable: () => true,
  group: 'Scripts',
  id: 'scripts/npmrc',
  keywords: ['npmrc', 'npm config', 'registry', 'package manager', 'settings'],
  label: '.npmrc - package manager config',
  scope: 'root',
  tags: ['package-manager', 'config', 'registry'],
  target: {
    filepath: '.npmrc',
    kind: 'text',
    render: () => npmrcContent(),
  },
});
