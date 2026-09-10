import { defineTask, type TargetPolicy } from '@/factory/define-task.js';
import {
  hasInstalledDependency,
  resolveScriptsResolution,
  toScriptsPatch,
} from '@/factory/scripts.js';

const CANDIDATES = [{ script: 'commit', value: 'czg' }];

export const czgTask = defineTask({
  applicable: () => true,
  deps: [{ depName: 'czg', dev: true }],
  group: 'Release',
  id: 'release/czg',
  label: 'czg (commitizen)',
  scope: 'root',
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
  targets: async (cwd) => {
    const { missingScripts, pkg } = await resolveScriptsResolution(
      cwd,
      CANDIDATES
    );
    const hasDep = hasInstalledDependency(pkg, 'czg');
    // The packageJson factory reported `new` when the whole script was absent
    // and the dependency was not installed, and `patch` once it was.
    const policy: TargetPolicy = () =>
      missingScripts.length > 0 && !hasDep ? 'new' : undefined;
    return [
      {
        change: () => toScriptsPatch(missingScripts),
        kind: 'packageJson',
        policy,
      },
    ];
  },
});
