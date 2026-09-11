import type { ProjectProfile } from '@xtarterize/core';
import { readPackageJson } from '@xtarterize/core';
import { mergeJson } from '@xtarterize/patchers';

import { defineSingleTargetTask } from '@/factory/define-task.js';

const TASK_ID = 'quality/package-engines';

/**
 * The change patch merges the existing package.json first so authored
 * devEngines values win over the recommended ones.
 */
async function resolveDevEngines(
  cwd: string,
  profile: ProjectProfile
): Promise<object> {
  const pkg = await readPackageJson(cwd);
  const pm = profile.packageManager;
  const pmField = pkg?.packageManager as string | undefined;
  let pmVersion = pm === 'pnpm' ? '>=9' : '>=10';

  if (pmField) {
    // format: "pnpm@11.8.0" or "npm@10.8.0"
    const atIndex = pmField.indexOf('@');
    if (atIndex !== -1) {
      pmVersion = `>=${pmField.slice(atIndex + 1)}`;
    }
  }

  return mergeJson(pkg ?? {}, {
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
  });
}

export const packageEnginesTask = defineSingleTargetTask({
  applicable: () => true,
  group: 'Quality',
  id: TASK_ID,
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
  target: {
    change: resolveDevEngines,
    kind: 'packageJson',
  },
});
