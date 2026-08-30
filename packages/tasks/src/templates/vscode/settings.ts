import type { ProjectProfile } from '@xtarterize/core';

export function renderVscodeSettings(profile: ProjectProfile): string {
  const settings: Record<string, unknown> = {
    '[javascript]': { 'editor.defaultFormatter': 'biomejs.biome' },
    '[json]': { 'editor.defaultFormatter': 'biomejs.biome' },
    '[jsonc]': { 'editor.defaultFormatter': 'biomejs.biome' },
    '[typescript]': { 'editor.defaultFormatter': 'biomejs.biome' },
    '[typescriptreact]': { 'editor.defaultFormatter': 'biomejs.biome' },
    'editor.codeActionsOnSave': {
      'source.fixAll.biome': 'explicit',
      'source.organizeImports.biome': 'explicit',
    },
    'editor.defaultFormatter': 'biomejs.biome',
    'editor.formatOnPaste': false,
    'editor.formatOnSave': true,
    'javascript.updateImportsOnFileMove.enabled': 'always',
    'typescript.preferences.importModuleSpecifier': 'non-relative',
    'typescript.updateImportsOnFileMove.enabled': 'always',
  };

  if (profile.monorepo) {
    settings['typescript.tsdk'] = 'node_modules/typescript/lib';
    settings['search.exclude'] = {
      '**/.turbo': true,
      '**/dist': true,
      '**/node_modules': true,
    };
  }

  if (profile.bundler === 'vite') {
    settings['files.associations'] = {
      '*.css': 'tailwindcss',
    };
  }

  if (profile.framework === 'vue') {
    settings['vue.server.hybridMode'] = true;
    settings['[vue]'] = { 'editor.defaultFormatter': 'Vue.volar' };
  }

  if (profile.framework === 'react-native') {
    settings['typescript.tsserver.watchOptions'] = {
      watchDirectory: 'useFsEvents',
      watchFile: 'useFsEvents',
    };
  }

  if (profile.router === 'next') {
    settings['typescript.tsdk'] = 'node_modules/typescript/lib';
    settings['emmet.includeLanguages'] = {
      javascript: 'javascriptreact',
      typescript: 'typescriptreact',
    };
  }

  if (profile.router === 'tanstack-router') {
    settings['files.exclude'] = {
      '**/routeTree.gen.ts': true,
    };
  }

  if (
    profile.styling.includes('tailwind') ||
    profile.styling.includes('nativewind')
  ) {
    settings['tailwindCSS.experimental.classRegex'] = [
      ['cva\\(([^)]*)\\)', '["\'`]([^"\'`]*).*?["\'`]'],
      ['cn\\(([^)]*)\\)', '["\'`]([^"\'`]*).*?["\'`]'],
    ];
  }

  if (profile.typescript) {
    settings['typescript.disableAutomaticTypeAcquisition'] = true;
    settings['typescript.enablePromptUseWorkspaceTsdk'] = true;
  }

  return JSON.stringify(settings, null, 2);
}
