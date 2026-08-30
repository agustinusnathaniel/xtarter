import { createFileTask } from '@/factory';
import { renderKnipConfig } from '@/templates/knip-config.js';

export const knipTask = createFileTask({
  applicable: () => true,
  extensions: ['.ts', '.mts', '.js', '.json'],
  filepath: 'knip.config',
  group: 'Quality',
  id: 'quality/knip',
  label: 'Knip (unused code detection)',
  render: (profile) =>
    renderKnipConfig(profile, profile.typescript ? 'ts' : 'js'),
  searchMeta: {
    configTargets: ['knip.config.ts'],
    keywords: [
      'knip',
      'dead code',
      'unused exports',
      'tree shaking',
      'analyze',
    ],
    tags: ['dead-code', 'quality', 'analysis', 'detection'],
  },
});
