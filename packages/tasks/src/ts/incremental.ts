import { defineTask } from '@/factory/define-task.js';

export const incrementalTask = defineTask({
  applicable: (profile) => profile.typescript,
  group: 'TypeScript',
  id: 'ts/incremental',
  label: 'tsconfig - incremental: true',
  searchMeta: {
    keywords: [
      'incremental',
      'build speed',
      'typescript performance',
      'watch mode',
    ],
    tags: ['typescript', 'performance', 'build-speed'],
  },
  targets: [
    {
      filepath: 'tsconfig.json',
      incoming: () => ({
        compilerOptions: { incremental: true, tsBuildInfoFile: '.tsbuildinfo' },
      }),
      kind: 'jsonMerge',
    },
  ],
});
