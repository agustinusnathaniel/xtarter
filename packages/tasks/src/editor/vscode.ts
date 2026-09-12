import { defineTask } from '@/factory/define-task.js';
import { vscodeExtensions } from '@/templates/vscode/extensions.js';
import { vscodeSettings } from '@/templates/vscode/settings.js';

function mergeExtensions(existing: object, incoming: object): object {
  const existingRecs = (existing as Record<string, unknown>).recommendations;
  const incomingRecs = (incoming as Record<string, unknown>)
    .recommendations as Array<string>;
  const existingArr = Array.isArray(existingRecs)
    ? (existingRecs as Array<string>)
    : [];
  const union = [...new Set([...existingArr, ...incomingRecs])];
  return { ...existing, recommendations: union };
}

export const vscodeTask = defineTask({
  applicable: () => true,
  group: 'Editor',
  id: 'editor/vscode',
  keywords: [
    'vscode',
    'visual studio code',
    'editor config',
    'ide settings',
    'extensions',
  ],
  label: 'VSCode settings + extensions',
  scope: 'root',
  tags: ['editor', 'ide', 'settings', 'extensions'],
  targets: [
    {
      extensions: ['.json'],
      filepath: '.vscode/settings.json',
      incoming: (_cwd, profile) => vscodeSettings(profile),
      kind: 'jsonMerge',
    },
    {
      extensions: ['.json'],
      filepath: '.vscode/extensions.json',
      incoming: (_cwd, profile) => vscodeExtensions(profile),
      kind: 'jsonMerge',
      merge: mergeExtensions,
    },
  ],
});
