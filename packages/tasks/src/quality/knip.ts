import { defineSingleTargetTask } from '@/factory/define-task.js';
import { renderKnipConfig } from '@/templates/knip-config.js';

export const knipTask = defineSingleTargetTask({
  applicable: () => true,
  group: 'Quality',
  id: 'quality/knip',
  keywords: ['knip', 'dead code', 'unused exports', 'tree shaking', 'analyze'],
  label: 'Knip (unused code detection)',
  tags: ['dead-code', 'quality', 'analysis', 'detection'],
  target: {
    extensions: ['.ts', '.mts', '.js', '.json'],
    filepath: 'knip.config',
    kind: 'text',
    render: (profile) =>
      renderKnipConfig(profile, profile.typescript ? 'ts' : 'js'),
  },
});
