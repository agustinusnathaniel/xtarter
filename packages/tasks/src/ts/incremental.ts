import { defineSingleTargetTask } from '@/factory/define-task.js';

export const incrementalTask = defineSingleTargetTask({
  applicable: (profile) => profile.typescript,
  group: 'TypeScript',
  id: 'ts/incremental',
  keywords: [
    'incremental',
    'build speed',
    'typescript performance',
    'watch mode',
  ],
  label: 'tsconfig - incremental: true',
  tags: ['typescript', 'performance', 'build-speed'],
  target: {
    filepath: 'tsconfig.json',
    incoming: () => ({
      compilerOptions: { incremental: true, tsBuildInfoFile: '.tsbuildinfo' },
    }),
    kind: 'jsonMerge',
  },
});
