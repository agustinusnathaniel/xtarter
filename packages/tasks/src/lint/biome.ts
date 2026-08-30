import { createJsonMergeTask } from '@/factory';
import { renderBiomeJson } from '@/templates/biome-json.js';

export const biomeTask = createJsonMergeTask({
  applicable: (profile) =>
    !(
      profile.existing.eslint ||
      profile.existing.oxlint ||
      profile.existing.oxfmt
    ) &&
    (profile.existing.biome || !profile.vitePlus),
  depNames: ['@biomejs/biome', 'ultracite'],
  extensions: ['.json', '.jsonc'],
  filepath: 'biome.json',
  group: 'Linting & Formatting',
  id: 'lint/biome',
  incoming: (_cwd, profile) => JSON.parse(renderBiomeJson(profile)),
  installDev: true,
  label: 'Biome (lint + format)',
  searchMeta: {
    configTargets: ['biome.json'],
    keywords: ['biome', 'linter', 'formatter', 'lint', 'format', 'all-in-one'],
    tags: ['linting', 'formatting', 'all-in-one', 'quality'],
  },
});
