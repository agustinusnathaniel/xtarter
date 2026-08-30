import { createMultiFileJsonMergeTask } from '@/factory';
import { renderVscodeExtensions } from '@/templates/vscode/extensions.js';
import { renderVscodeSettings } from '@/templates/vscode/settings.js';

function mergeExtensions(existing: object, incoming: object): object {
  const existingRecs = (existing as Record<string, unknown>).recommendations;
  const incomingRecs = (incoming as Record<string, unknown>).recommendations;
  if (!Array.isArray(incomingRecs)) {
    return { ...existing, ...incoming };
  }
  const existingArr = Array.isArray(existingRecs)
    ? (existingRecs as Array<string>)
    : [];
  const union = [
    ...new Set([...existingArr, ...(incomingRecs as Array<string>)]),
  ];
  return { ...existing, recommendations: union };
}

export const vscodeTask = createMultiFileJsonMergeTask({
  applicable: () => true,
  files: [
    {
      extensions: ['.json'],
      filepath: '.vscode/settings.json',
      incoming: (profile) => JSON.parse(renderVscodeSettings(profile)),
    },
    {
      extensions: ['.json'],
      filepath: '.vscode/extensions.json',
      incoming: (profile) => JSON.parse(renderVscodeExtensions(profile)),
      merge: mergeExtensions,
    },
  ],
  group: 'Editor',
  id: 'editor/vscode',
  label: 'VSCode settings + extensions',
  scope: 'root',
  searchMeta: {
    configTargets: ['.vscode/settings.json', '.vscode/extensions.json'],
    keywords: [
      'vscode',
      'visual studio code',
      'editor config',
      'ide settings',
      'extensions',
    ],
    tags: ['editor', 'ide', 'settings', 'extensions'],
  },
});
