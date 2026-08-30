import type { ProjectProfile } from '@xtarterize/core';

export function renderVscodeExtensions(profile: ProjectProfile): string {
  const extensions = ['biomejs.biome', 'ms-vscode.vscode-typescript-next'];

  if (
    profile.styling.includes('tailwind') ||
    profile.styling.includes('nativewind')
  ) {
    extensions.push('bradlc.vscode-tailwindcss');
  }
  if (profile.framework === 'vue') {
    extensions.push('Vue.volar');
  }
  if (profile.framework === 'react-native') {
    extensions.push('expo.vscode-expo-tools');
  }

  return JSON.stringify({ recommendations: extensions }, null, 2);
}
