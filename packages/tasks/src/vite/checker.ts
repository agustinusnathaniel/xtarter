import { defineTask } from '@/factory/define-task.js';
import { createVitePluginTarget } from '@/vite/plugin.js';

export const viteCheckerTask = defineTask({
  applicable: (profile) =>
    profile.bundler === 'vite' && profile.runtime !== 'node',
  deps: [{ depName: 'vite-plugin-checker', dev: true }],
  group: 'Vite Plugins',
  id: 'vite/checker',
  keywords: [
    'vite checker',
    'type checking',
    'vite plugin',
    'build validation',
  ],
  label: 'vite-plugin-checker',
  scope: 'package',
  tags: ['vite', 'plugin', 'type-checking', 'linting'],
  targets: [
    createVitePluginTarget({
      depName: 'vite-plugin-checker',
      id: 'vite/checker',
      importName: 'checker',
      importStyle: 'default',
      pluginCall: 'checker({ typescript: true })',
    }),
  ],
});
