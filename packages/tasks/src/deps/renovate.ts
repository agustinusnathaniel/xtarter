import { readJsonIfExists } from '@xtarterize/core';
import { mergeJson } from '@xtarterize/patchers';

import { createJsonMergeTask, deepEqual, normalizeExtends } from '@/factory';

const incomingRenovate = () => ({
  $schema: 'https://docs.renovatebot.com/renovate-schema.json',
  extends: ['config:base', 'group:all'],
  ignoreDeps: ['node', 'pnpm'],
  major: { enabled: false },
  packageRules: [
    {
      automerge: true,
      automergeType: 'branch',
      groupName: 'all non-major dependencies',
      groupSlug: 'all-minor-patch',
      matchPackagePatterns: ['*'],
      matchUpdateTypes: ['minor', 'patch'],
    },
  ],
  rangeStrategy: 'bump',
  schedule: ['before 1am on the first day of the month'],
  stabilityDays: 2,
  timezone: 'Asia/Jakarta',
  updatePinnedDependencies: false,
});

export const renovateTask = createJsonMergeTask({
  applicable: (profile) => profile.hasGitHub,
  async checkFn({ fullPath, content }) {
    if (!(fullPath && content)) {
      return 'new';
    }
    const actual = normalizeExtends((await readJsonIfExists(fullPath)) ?? {});
    const expected = normalizeExtends(incomingRenovate());
    const merged = mergeJson(actual, expected);
    if (deepEqual(actual, merged)) {
      return 'skip';
    }
    return 'patch';
  },
  extensions: ['.json', '.json5'],
  filepath: 'renovate.json',
  group: 'Dependencies',
  id: 'deps/renovate',
  incoming: incomingRenovate,
  label: 'Renovate config',
  scope: 'root',
  searchMeta: {
    configTargets: ['renovate.json'],
    keywords: [
      'renovate',
      'dependencies',
      'dependency updates',
      'dependabot',
      'auto',
    ],
    tags: ['dependencies', 'updates', 'maintenance', 'automation'],
  },
});
