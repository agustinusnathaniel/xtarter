import { mergeJson, parseJsonc } from '@xtarterize/patchers';

import { createFileTask, deepEqual } from '@/factory';
import { renderOxfmtTsConfig } from '@/templates/oxfmt-template.js';
import {
  renderOxlintJsonConfig,
  renderOxlintTsConfig,
} from '@/templates/oxlint-template.js';

export const oxlintTask = createFileTask({
  applicable: (profile) =>
    !(profile.existing.eslint || profile.existing.biome) &&
    (profile.vitePlus || profile.existing.oxlint),
  async checkFn({ profile, fullPath, content }) {
    if (!(fullPath && content)) {
      return 'new';
    }

    if (content.trim().startsWith('{')) {
      const existing = JSON.parse(content) as Record<string, unknown>;
      const desired = JSON.parse(renderOxlintJsonConfig(profile)) as Record<
        string,
        unknown
      >;
      const merged = mergeJson(existing, desired);
      if (deepEqual(existing, merged)) {
        return 'skip';
      }
      return 'patch';
    }

    if (content.includes('ultracite/oxlint/')) {
      return 'skip';
    }

    return 'conflict';
  },
  depNames: ['oxlint', 'ultracite'],
  extensions: ['.ts', '.js', '.mjs', '.json'],
  filepath: 'oxlint.config',
  group: 'Linting & Formatting',
  id: 'lint/oxlint',
  installDev: true,
  label: 'Oxlint config',
  render: (profile, existing) => {
    if (existing?.trim().startsWith('{')) {
      const existingConfig = parseJsonc(existing) as Record<string, unknown>;
      const desiredConfig = JSON.parse(
        renderOxlintJsonConfig(profile)
      ) as Record<string, unknown>;
      const merged = mergeJson(existingConfig, desiredConfig);
      return JSON.stringify(merged, null, 2);
    }

    return renderOxlintTsConfig(profile);
  },
  searchMeta: {
    configTargets: ['oxlint.config.ts'],
    keywords: ['oxlint', 'linter', 'rust', 'static analysis', 'fast'],
    tags: ['linting', 'rust', 'performance', 'quality'],
  },
});

export const oxfmtTask = createFileTask({
  applicable: (profile) =>
    !(profile.existing.eslint || profile.existing.biome) &&
    (profile.vitePlus || profile.existing.oxfmt),
  async checkFn({ fullPath, content }) {
    if (!(fullPath && content)) {
      return 'new';
    }

    if (content.trim().startsWith('{')) {
      return 'skip';
    }

    if (content.includes('ultracite/oxfmt')) {
      return 'skip';
    }

    return 'skip';
  },
  depNames: ['oxfmt', 'ultracite'],
  extensions: ['.ts', '.js', '.mjs', '.json'],
  filepath: 'oxfmt.config',
  group: 'Linting & Formatting',
  id: 'lint/oxfmt',
  installDev: true,
  label: 'Oxfmt config',
  render: (_profile, existing) => {
    if (existing?.trim().startsWith('{')) {
      return existing;
    }

    return renderOxfmtTsConfig(_profile);
  },
  searchMeta: {
    configTargets: ['oxfmt.config.ts'],
    keywords: ['oxfmt', 'formatter', 'rust', 'format', 'style'],
    tags: ['formatting', 'rust', 'style'],
  },
});
