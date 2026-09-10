import type { ProjectProfile } from '@xtarterize/core';

import { defineSingleTargetTask } from '@/factory/define-task.js';

function pnpmWorkspaceContent(profile: ProjectProfile): string {
  if (profile.monorepo) {
    return ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n');
  }
  return '# pnpm workspace config\n';
}

export const pnpmWorkspaceTask = defineSingleTargetTask({
  applicable: (profile) => profile.packageManager === 'pnpm',
  group: 'Workspace',
  id: 'workspace/pnpm-workspace',
  label: 'pnpm-workspace.yaml - pnpm workspace config',
  scope: 'root',
  searchMeta: {
    keywords: [
      'pnpm',
      'workspace',
      'monorepo',
      'single-package',
      'pnpm-workspace',
      'package manager',
    ],
    tags: ['workspace', 'pnpm', 'package-manager'],
  },
  target: {
    filepath: 'pnpm-workspace.yaml',
    kind: 'text',
    render: (profile) => pnpmWorkspaceContent(profile),
  },
});
