import { defineTask } from '@/factory/define-task.js';
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

export const vscodeTask = defineTask({
  applicable: () => true,
  group: 'Editor',
  id: 'editor/vscode',
  label: 'VSCode settings + extensions',
  scope: 'root',
  searchMeta: {
    keywords: [
      'vscode',
      'visual studio code',
      'editor config',
      'ide settings',
      'extensions',
    ],
    tags: ['editor', 'ide', 'settings', 'extensions'],
  },
  targets: [
    {
      extensions: ['.json'],
      filepath: '.vscode/settings.json',
      incoming: (_cwd, profile) => JSON.parse(renderVscodeSettings(profile)),
      kind: 'jsonMerge',
    },
    {
      extensions: ['.json'],
      filepath: '.vscode/extensions.json',
      incoming: (_cwd, profile) => JSON.parse(renderVscodeExtensions(profile)),
      kind: 'jsonMerge',
      merge: mergeExtensions,
    },
  ],
});
