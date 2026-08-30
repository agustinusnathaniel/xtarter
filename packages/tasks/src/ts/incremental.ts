import { createJsonMergeTask } from '@/factory';

export const incrementalTask = createJsonMergeTask({
  applicable: (profile) => profile.typescript,
  filepath: 'tsconfig.json',
  group: 'TypeScript',
  id: 'ts/incremental',
  incoming: () => ({
    compilerOptions: { incremental: true, tsBuildInfoFile: '.tsbuildinfo' },
  }),
  label: 'tsconfig - incremental: true',
  searchMeta: {
    configTargets: ['tsconfig.json'],
    keywords: [
      'incremental',
      'build speed',
      'typescript performance',
      'watch mode',
    ],
    tags: ['typescript', 'performance', 'build-speed'],
  },
});
