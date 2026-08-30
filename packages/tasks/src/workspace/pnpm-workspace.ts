import type { ProjectProfile } from '@xtarterize/core';

import { createFileTask } from '@/factory';

function pnpmWorkspaceContent(profile: ProjectProfile): string {
  if (profile.monorepo) {
    return ['packages:', "  - 'apps/*'", "  - 'packages/*'", ''].join('\n');
  }
  return '# pnpm workspace config\n';
}

export const pnpmWorkspaceTask = createFileTask({
  applicable: (profile) => profile.packageManager === 'pnpm',
  filepath: 'pnpm-workspace.yaml',
  group: 'Workspace',
  id: 'workspace/pnpm-workspace',
  label: 'pnpm-workspace.yaml - pnpm workspace config',
  render: (profile, _existing) => pnpmWorkspaceContent(profile),
  scope: 'root',
  searchMeta: {
    configTargets: ['pnpm-workspace.yaml'],
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
});
