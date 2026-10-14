import { fileExists, resolvePath } from '@xtarterize/core';

import { defineTask, type TargetPolicy } from '@/factory/define-task.js';
import {
  hasInstalledDependency,
  resolveScriptsResolution,
  toScriptsPatch,
} from '@/factory/scripts.js';

const VERSIONRC_FILEPATH = '.versionrc';
const CANDIDATES = [{ script: 'release', value: 'commit-and-tag-version' }];

const VERSIONRC_TEMPLATE = `{
  "packageFiles": ["package.json"],
  "bumpFiles": ["package.json"],
  "types": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "chore", "hidden": true },
    { "type": "docs", "section": "Documentation" },
    { "type": "style", "hidden": true },
    { "type": "refactor", "section": "Refactors" },
    { "type": "perf", "section": "Performance" },
    { "type": "test", "hidden": true }
  ]
}`;

export const catVersionTask = defineTask({
  applicable: () => true,
  configTargets: ['.versionrc'],
  deps: [{ depName: 'commit-and-tag-version', dev: true }],
  group: 'Release',
  id: 'release/cat-version',
  keywords: [
    'commit-and-tag-version',
    'version bump',
    'changelog',
    'release',
    'semver',
  ],
  label: 'commit-and-tag-version',
  scope: 'root',
  targets: async (cwd) => {
    const { missingScripts, pkg } = await resolveScriptsResolution(
      cwd,
      CANDIDATES
    );
    const hasDep = hasInstalledDependency(pkg, 'commit-and-tag-version');
    const hasVersionrc = await fileExists(resolvePath(cwd, VERSIONRC_FILEPATH));
    const allMissing =
      missingScripts.length === CANDIDATES.length && !hasVersionrc;
    const scriptsPolicy: TargetPolicy = () =>
      allMissing && !hasDep ? 'new' : undefined;
    const filePolicy: TargetPolicy = ({ before }) => {
      if (before !== null) {
        return 'skip';
      }
      return missingScripts.length === 0 ? 'patch' : undefined;
    };
    return [
      {
        change: () => toScriptsPatch(missingScripts),
        kind: 'packageJson',
        policy: scriptsPolicy,
      },
      {
        filepath: VERSIONRC_FILEPATH,
        kind: 'text',
        policy: filePolicy,
        render: () => VERSIONRC_TEMPLATE,
      },
    ];
  },
});
