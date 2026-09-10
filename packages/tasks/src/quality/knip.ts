import { defineTask } from '@/factory/define-task.js';
import { renderKnipConfig } from '@/templates/knip-config.js';

export const knipTask = defineTask({
  applicable: () => true,
  group: 'Quality',
  id: 'quality/knip',
  label: 'Knip (unused code detection)',
  searchMeta: {
    keywords: [
      'knip',
      'dead code',
      'unused exports',
      'tree shaking',
      'analyze',
    ],
    tags: ['dead-code', 'quality', 'analysis', 'detection'],
  },
  targets: [
    {
      extensions: ['.ts', '.mts', '.js', '.json'],
      filepath: 'knip.config',
      kind: 'text',
      render: (profile) =>
        renderKnipConfig(profile, profile.typescript ? 'ts' : 'js'),
    },
  ],
});
