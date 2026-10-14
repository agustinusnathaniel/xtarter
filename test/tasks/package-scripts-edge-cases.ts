import {
  DEPS,
  defineScriptCases,
  scriptPkg,
} from './package-scripts-runner.js';

/**
 * Edge cases for `packageScriptsTask`, formerly
 * `package-scripts-edge.test.ts`. The suite nests them under the original
 * `edge cases` describe so the full test names are preserved.
 */
export const packageScriptsEdgeCases = defineScriptCases([
  {
    afterContains: ['"biome"', '"typecheck"', '"test"', '"check:turbo"'],
    name: 'handles empty scripts object',
    pkg: scriptPkg('empty-scripts', {}),
    status: 'new',
  },
  {
    afterContains: ['"test"', '"check:turbo"', 'turbo run lint test'],
    afterNotContains: ['"typecheck"', '"knip"'],
    name: 'non-TS project does not add typecheck or knip',
    pkg: scriptPkg('non-ts', { lint: 'biome check .' }, DEPS.biomeTurbo),
  },
  {
    afterContains: ['"biome"', '"typecheck"'],
    afterNotContains: ['check:turbo'],
    name: 'non-turbo monorepo does not add check:turbo',
    pkg: scriptPkg('no-turbo', {}, DEPS.ts),
  },
  {
    afterContains: ['"check:turbo"'],
    name: 'detects turbo in production dependencies for check:turbo',
    pkg: {
      dependencies: { turbo: '^2.0.0' },
      devDependencies: { '@biomejs/biome': '^1.0.0', typescript: '^5.3.0' },
      name: 'turbo-prod-dep',
      scripts: {},
      type: 'module',
    },
  },
  {
    afterContains: ['"check:turbo"', 'turbo run biome types unit'],
    name: 'references renamed test and typecheck scripts in check:turbo',
    pkg: scriptPkg(
      'turbo-renamed',
      { types: 'tsc --noEmit', unit: 'vitest run' },
      DEPS.turboTsVitest
    ),
  },
  {
    afterDefined: true,
    name: 'ignores malformed non-string script values',
    pkg: scriptPkg(
      'malformed-scripts',
      { build: 42, test: null },
      DEPS.biomeTs
    ),
    status: 'new',
  },
  {
    afterContains: ['"check:turbo"', 'turbo run check typecheck test'],
    afterNotContains: ['"biome"'],
    name: 'check:turbo uses only existing keys when all exist',
    pkg: scriptPkg('turbo-all-exist', {
      check: 'biome check --write .',
      lint: 'biome check .',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    }),
    status: 'patch',
  },
  {
    afterContains: ['"check:turbo": "turbo run lint build"'],
    afterNotContains: ['turbo run biome typecheck test'],
    name: 'preserves existing check:turbo with different tasks',
    pkg: scriptPkg('check-turbo-diff', {
      'check:turbo': 'turbo run lint build',
    }),
    status: 'patch',
  },
]);

/**
 * Pragmatic-approach cases, formerly `package-scripts-pragmatic.test.ts`.
 * The suite nests them under the original describe chain so the full test
 * names are preserved.
 */
export const packageScriptsPragmaticCases = defineScriptCases([
  {
    afterContains: [
      '"test"',
      '"biome"',
      '"typecheck"',
      '"check:turbo"',
      'turbo run biome typecheck test',
    ],
    name: 'skips test when existing has vitest',
    pkg: scriptPkg('test-skip', { test: 'vitest run --coverage' }),
    status: 'patch',
  },
  {
    afterContains: ['"release"', '"biome"', '"typecheck"', '"test"'],
    name: 'skips release when existing has standard-version',
    pkg: {
      devDependencies: {
        '@biomejs/biome': '^1.0.0',
        'standard-version': '^9.0.0',
        turbo: '^2.0.0',
        typescript: '^5.3.0',
        vitest: '^1.0.0',
      },
      name: 'release-skip',
      scripts: { release: 'standard-version' },
      type: 'module',
    },
    status: 'patch',
  },
  {
    afterContains: [
      '"typecheck"',
      '"biome"',
      '"test"',
      '"check:turbo"',
      'turbo run biome typecheck test',
    ],
    name: 'skips typecheck when existing has tsc with different args',
    pkg: scriptPkg('typecheck-skip', { typecheck: 'tsc --noEmit --build' }),
    status: 'patch',
  },
]);
