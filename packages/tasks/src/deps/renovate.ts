import { defineSingleTargetTask } from '@/factory/define-task.js';

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

export const renovateTask = defineSingleTargetTask({
  applicable: (profile) => profile.hasGitHub,
  group: 'Dependencies',
  id: 'deps/renovate',
  label: 'Renovate config',
  scope: 'root',
  searchMeta: {
    keywords: [
      'renovate',
      'dependencies',
      'dependency updates',
      'dependabot',
      'auto',
    ],
    tags: ['dependencies', 'updates', 'maintenance', 'automation'],
  },
  target: {
    extensions: ['.json', '.json5'],
    filepath: 'renovate.json',
    incoming: () => incomingRenovate(),
    kind: 'jsonMerge',
  },
});
