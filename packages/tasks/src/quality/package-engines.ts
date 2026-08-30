import { readPackageJson } from '@xtarterize/core';

import { createJsonMergeTask } from '@/factory';

export const packageEnginesTask = createJsonMergeTask({
  applicable: () => true,
  filepath: 'package.json',
  group: 'Quality',
  id: 'quality/package-engines',
  incoming: async (cwd, profile) => {
    const pm = profile.packageManager;
    const pkg = await readPackageJson(cwd);
    const pmField = pkg?.packageManager as string | undefined;
    let pmVersion = pm === 'pnpm' ? '>=9' : '>=10';

    if (pmField) {
      // format: "pnpm@11.8.0" or "npm@10.8.0"
      const atIndex = pmField.indexOf('@');
      if (atIndex !== -1) {
        const version = pmField.slice(atIndex + 1);
        pmVersion = `>=${version}`;
      }
    }

    return {
      devEngines: {
        packageManager: {
          name: pm,
          version: pmVersion,
        },
        runtime: {
          name: 'node',
          version: `>=${profile.nodeVersion}`,
        },
      },
    };
  },
  label: 'devEngines in package.json',
  scope: 'root',
  searchMeta: {
    configTargets: ['package.json'],
    keywords: [
      'devEngines',
      'engines',
      'node version',
      'package manager',
      'pnpm',
      'runtime',
    ],
    tags: ['quality', 'engines', 'node', 'pnpm', 'package-manager'],
  },
});
