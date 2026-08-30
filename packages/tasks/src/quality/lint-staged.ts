import { readPackageJson } from '@xtarterize/core';

import { createPackageJsonTask } from '@/factory';

async function lintCmd(cwd: string): Promise<string> {
  const pkg = await readPackageJson(cwd);
  const hasUltracite = !!(
    pkg?.devDependencies?.ultracite || pkg?.dependencies?.ultracite
  );
  return hasUltracite ? 'ultracite fix' : 'biome check --write';
}

export const lintStagedTask = createPackageJsonTask({
  applicable: (profile) => !profile.vitePlus,
  depName: 'lint-staged',
  files: [
    {
      filepath: '.lintstagedrc.json',
      render: async (cwd) => {
        const cmd = await lintCmd(cwd);
        return `${JSON.stringify(
          {
            '*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}': [cmd],
            '*.{json,md,yaml,yml}': [cmd],
          },
          null,
          2
        )}\n`;
      },
    },
  ],
  group: 'Quality',
  id: 'quality/lint-staged',
  installDev: true,
  label: 'lint-staged config',
  searchMeta: {
    configTargets: ['.lintstagedrc.json'],
    keywords: [
      'lint-staged',
      'staged files',
      'pre-commit',
      'git hook',
      'quality gate',
    ],
    tags: ['git-hooks', 'pre-commit', 'linting', 'quality'],
  },
});
