import { readPackageJson } from '@xtarterize/core';

import { defineTask } from '@/factory/define-task.js';
import { hasInstalledDependency } from '@/factory/scripts.js';

async function lintCmd(cwd: string): Promise<string> {
  const pkg = await readPackageJson(cwd);
  return hasInstalledDependency(pkg, 'ultracite')
    ? 'ultracite fix'
    : 'biome check --write';
}

function renderLintStagedConfig(cmd: string): string {
  return `${JSON.stringify(
    {
      '*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}': [cmd],
      '*.{json,md,yaml,yml}': [cmd],
    },
    null,
    2
  )}\n`;
}

export const lintStagedTask = defineTask({
  applicable: (profile) => !profile.vitePlus,
  configTargets: ['.lintstagedrc.json'],
  deps: [{ depName: 'lint-staged', dev: true }],
  group: 'Quality',
  id: 'quality/lint-staged',
  keywords: [
    'lint-staged',
    'staged files',
    'pre-commit',
    'git hook',
    'quality gate',
  ],
  label: 'lint-staged config',
  tags: ['git-hooks', 'pre-commit', 'linting', 'quality'],
  targets: async (cwd) => {
    const content = renderLintStagedConfig(await lintCmd(cwd));
    return [
      {
        filepath: '.lintstagedrc.json',
        kind: 'text',
        // A missing config reported `patch`; an existing config was never
        // compared or overwritten.
        policy: ({ before }) => (before === null ? 'patch' : 'skip'),
        render: () => content,
      },
    ];
  },
});
