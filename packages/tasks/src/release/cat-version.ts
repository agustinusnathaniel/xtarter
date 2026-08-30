import { createPackageJsonTask } from '@/factory';

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

export const catVersionTask = createPackageJsonTask({
  applicable: () => true,
  depName: 'commit-and-tag-version',
  files: [
    {
      filepath: '.versionrc',
      render: () => VERSIONRC_TEMPLATE,
    },
  ],
  group: 'Release',
  id: 'release/cat-version',
  installDev: true,
  label: 'commit-and-tag-version',
  scope: 'root',
  scripts: [{ script: 'release', value: 'commit-and-tag-version' }],
  searchMeta: {
    configTargets: ['.versionrc'],
    keywords: [
      'commit-and-tag-version',
      'version bump',
      'changelog',
      'release',
      'semver',
    ],
    tags: ['release', 'version', 'changelog', 'semver'],
  },
});
