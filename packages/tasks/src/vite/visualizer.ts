import { defineTask } from '@/factory/define-task.js';
import { createVitePluginTarget } from '@/vite/plugin.js';

export const viteVisualizerTask = defineTask({
  applicable: (profile) =>
    profile.bundler === 'vite' && profile.runtime !== 'node',
  deps: [{ depName: 'rollup-plugin-visualizer', dev: true }],
  group: 'Vite Plugins',
  id: 'vite/visualizer',
  label: 'rollup-plugin-visualizer',
  scope: 'package',
  searchMeta: {
    keywords: [
      'visualizer',
      'bundle analysis',
      'vite plugin',
      'rollup',
      'size',
    ],
    tags: ['vite', 'plugin', 'bundle', 'analysis'],
  },
  targets: [
    createVitePluginTarget({
      depName: 'rollup-plugin-visualizer',
      id: 'vite/visualizer',
      importName: 'visualizer',
      importStyle: 'named',
      pluginCall: 'visualizer({ open: false, gzipSize: true })',
    }),
  ],
});
