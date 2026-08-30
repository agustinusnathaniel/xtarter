import { createVitePluginTask } from '@/factory';

export const viteCheckerTask = createVitePluginTask({
  applicable: (profile) =>
    profile.bundler === 'vite' && profile.runtime !== 'node',
  checkString: 'vite-plugin-checker',
  depName: 'vite-plugin-checker',
  group: 'Vite Plugins',
  id: 'vite/checker',
  importName: 'checker',
  importStyle: 'default',
  label: 'vite-plugin-checker',
  pluginCall: 'checker({ typescript: true })',
  scope: 'package',
  searchMeta: {
    configTargets: ['vite.config.ts'],
    keywords: [
      'vite checker',
      'type checking',
      'vite plugin',
      'build validation',
    ],
    tags: ['vite', 'plugin', 'type-checking', 'linting'],
  },
});
