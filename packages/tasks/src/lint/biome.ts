import { defineTask } from '@/factory/define-task.js';
import { renderBiomeJson } from '@/templates/biome-json.js';

export const biomeTask = defineTask({
  applicable: (profile) =>
    !(
      profile.existing.eslint ||
      profile.existing.oxlint ||
      profile.existing.oxfmt
    ) &&
    (profile.existing.biome || !profile.vitePlus),
  deps: [
    { depName: '@biomejs/biome', dev: true },
    { depName: 'ultracite', dev: true },
  ],
  group: 'Linting & Formatting',
  id: 'lint/biome',
  label: 'Biome (lint + format)',
  searchMeta: {
    keywords: ['biome', 'linter', 'formatter', 'lint', 'format', 'all-in-one'],
    tags: ['linting', 'formatting', 'all-in-one', 'quality'],
  },
  targets: [
    {
      extensions: ['.json', '.jsonc'],
      filepath: 'biome.json',
      incoming: (_cwd, profile) => JSON.parse(renderBiomeJson(profile)),
      kind: 'jsonMerge',
    },
  ],
});
