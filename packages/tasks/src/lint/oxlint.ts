import { isDeepStrictEqual } from 'node:util';
import { mergeJson, parseJsonc } from '@xtarterize/patchers';

import { defineTask, type TargetPolicy } from '@/factory/define-task.js';
import { renderOxfmtTsConfig } from '@/templates/oxfmt-template.js';
import {
  renderOxlintJsonConfig,
  renderOxlintTsConfig,
} from '@/templates/oxlint-template.js';

const OXLINT_MARKER = 'ultracite/oxlint/';

/**
 * JSON configs report `patch` only when the merge changes the parsed object;
 * TypeScript configs that already extend ultracite are accepted as-is.
 */
const oxlintPolicy: TargetPolicy = ({ before, after }) => {
  if (before === null) {
    return;
  }
  if (before.trim().startsWith('{')) {
    return isDeepStrictEqual(parseJsonc(before), parseJsonc(after))
      ? 'skip'
      : 'patch';
  }
  return before.includes(OXLINT_MARKER) ? 'skip' : undefined;
};

export const oxlintTask = defineTask({
  applicable: (profile) =>
    !(profile.existing.eslint || profile.existing.biome) &&
    (profile.vitePlus || profile.existing.oxlint),
  deps: [
    { depName: 'oxlint', dev: true },
    { depName: 'ultracite', dev: true },
  ],
  group: 'Linting & Formatting',
  id: 'lint/oxlint',
  label: 'Oxlint config',
  searchMeta: {
    keywords: ['oxlint', 'linter', 'rust', 'static analysis', 'fast'],
    tags: ['linting', 'rust', 'performance', 'quality'],
  },
  targets: [
    {
      extensions: ['.ts', '.js', '.mjs', '.json'],
      filepath: 'oxlint.config',
      kind: 'text',
      policy: oxlintPolicy,
      render: (profile, existing) => {
        if (existing?.trim().startsWith('{')) {
          const existingConfig = parseJsonc(existing) as Record<
            string,
            unknown
          >;
          const desiredConfig = JSON.parse(
            renderOxlintJsonConfig(profile)
          ) as Record<string, unknown>;
          const merged = mergeJson(existingConfig, desiredConfig);
          return JSON.stringify(merged, null, 2);
        }

        return renderOxlintTsConfig(profile);
      },
    },
  ],
});

export const oxfmtTask = defineTask({
  applicable: (profile) =>
    !(profile.existing.eslint || profile.existing.biome) &&
    (profile.vitePlus || profile.existing.oxfmt),
  deps: [
    { depName: 'oxfmt', dev: true },
    { depName: 'ultracite', dev: true },
  ],
  group: 'Linting & Formatting',
  id: 'lint/oxfmt',
  label: 'Oxfmt config',
  searchMeta: {
    keywords: ['oxfmt', 'formatter', 'rust', 'format', 'style'],
    tags: ['formatting', 'rust', 'style'],
  },
  targets: [
    {
      extensions: ['.ts', '.js', '.mjs', '.json'],
      filepath: 'oxfmt.config',
      kind: 'text',
      render: (_profile, existing) => {
        if (existing?.trim().startsWith('{')) {
          return existing;
        }

        return renderOxfmtTsConfig(_profile);
      },
    },
  ],
});
