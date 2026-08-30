import { createVitePluginTask } from '@/factory';

export const viteVisualizerTask = createVitePluginTask({
  applicable: (profile) =>
    profile.bundler === 'vite' && profile.runtime !== 'node',
  checkString: 'rollup-plugin-visualizer',
  depName: 'rollup-plugin-visualizer',
  group: 'Vite Plugins',
  id: 'vite/visualizer',
  importName: 'visualizer',
  importStyle: 'named',
  label: 'rollup-plugin-visualizer',
  pluginCall: 'visualizer({ open: false, gzipSize: true })',
  scope: 'package',
  searchMeta: {
    configTargets: ['vite.config.ts'],
    keywords: [
      'visualizer',
      'bundle analysis',
      'vite plugin',
      'rollup',
      'size',
    ],
    tags: ['vite', 'plugin', 'bundle', 'analysis'],
  },
});
