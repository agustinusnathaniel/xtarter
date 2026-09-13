import {
  DEPS,
  defineScriptCases,
  scriptPkg,
  turboPkg,
} from './package-scripts-runner.js';

/**
 * Edge cases for `packageScriptsTask`, formerly
 * `package-scripts-edge.test.ts`. The suite nests them under the original
 * `edge cases` describe so the full test names are preserved.
 */
export const packageScriptsEdgeCases = defineScriptCases(17, [
  {
    afterContains: ['"biome"', '"typecheck"', '"test"', '"check:turbo"'],
    name: 'handles empty scripts object',
    pkg: scriptPkg('empty-scripts', {}),
    status: 'new',
  },
  {
    afterContains: ['"biome"', '"test"'],
    name: 'handles script with empty value',
    pkg: turboPkg('empty-value', { build: 'turbo run build', lint: '' }),
  },
  {
    afterContains: ['"check:turbo"'],
    afterNotContains: ['"biome"'],
    name: 'skips all lint scripts when existing eslint uses biome',
    pkg: {
      devDependencies: {
        eslint: '^8.0.0',
        turbo: '^2.0.0',
        typescript: '^5.3.0',
        vitest: '^1.0.0',
      },
      name: 'eslint-biome',
      scripts: { lint: 'eslint . --fix' },
      type: 'module',
    },
  },
  {
    afterContains: ['"biome"', '"typecheck"', '"test"'],
    name: 'does not skip biome when existing lint has different args',
    pkg: scriptPkg('diff-args', { lint: 'biome check src/' }),
  },
  {
    afterContains: ['"typecheck"', '"biome"', '"test"', '"check:turbo"'],
    name: 'handles namespaced script references separately',
    pkg: scriptPkg('pm-ref', {
      'npm:build': 'turbo run build',
      'pnpm:dev': 'turbo run dev',
      typecheck: 'tsc --noEmit',
    }),
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
    afterContains: ['"upgrade"'],
    name: 'adds upgrade script even with npx npm-check-updates',
    pkg: scriptPkg(
      'upgrade-dup',
      { upgrade: 'npx npm-check-updates -i' },
      DEPS.empty
    ),
  },
  {
    afterContains: ['"upgrade"'],
    name: 'adds upgrade when existing is different',
    pkg: scriptPkg('upgrade-diff', { upgrade: 'npm outdated' }, DEPS.empty),
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
    afterContains: ['"typecheck"', '"test"', '"check:turbo"'],
    name: 'check:turbo mixes existing and new tasks correctly',
    pkg: {
      devDependencies: {
        '@biomejs/biome': '^1.0.0',
        turbo: '^2.0.0',
        typescript: '^5.3.0',
      },
      name: 'turbo-mix',
      scripts: { fmt: 'biome check --write .' },
      type: 'module',
    },
  },
  {
    afterContains: ['"biome":'],
    name: 'handles script with trailing spaces',
    pkg: scriptPkg('trailing-spaces', { biome: 'biome check .   ' }),
  },
  {
    afterContains: ['check:turbo'],
    name: 'respects existing check:turbo with same tasks',
    pkg: scriptPkg('check-turbo-same', {
      biome: 'biome check .',
      'check:turbo': 'turbo run biome typecheck test',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    }),
    status: 'patch',
  },
  {
    afterContains: ['"check:turbo"', '"biome"'],
    name: 'overwrites existing check:turbo with different tasks',
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
export const packageScriptsPragmaticCases = defineScriptCases(8, [
  {
    afterContains: ['"biome"', '"test"', '"check:turbo"'],
    afterNotContains: ['"biome:fix"'],
    name: 'skips biome:fix when existing has check with biome',
    pkg: scriptPkg('biome-fix-skip', {
      biome: 'biome check .',
      check: 'biome check --write .',
    }),
    status: 'patch',
  },
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
    afterContains: ['"biome"', '"typecheck"', '"test"'],
    afterNotContains: ['"plop"'],
    name: 'skips plop when existing has hygen',
    pkg: {
      devDependencies: {
        '@biomejs/biome': '^1.0.0',
        hygen: '^6.0.0',
        turbo: '^2.0.0',
        typescript: '^5.3.0',
        vitest: '^1.0.0',
      },
      name: 'plop-skip',
      scripts: { generate: 'hygen' },
      type: 'module',
    },
    status: 'patch',
  },
  {
    afterContains: ['"knip"', '"biome"', '"typecheck"', '"test"'],
    name: 'skips knip when existing has depcheck',
    pkg: {
      devDependencies: {
        '@biomejs/biome': '^1.0.0',
        depcheck: '^1.0.0',
        turbo: '^2.0.0',
        typescript: '^5.3.0',
        vitest: '^1.0.0',
      },
      name: 'knip-skip',
      scripts: { knip: 'depcheck' },
      type: 'module',
    },
    status: 'patch',
  },
  {
    afterContains: ['"upgrade"', '"biome"', '"typecheck"', '"test"'],
    name: 'skips upgrade when existing has npm-check-updates',
    pkg: scriptPkg('upgrade-skip', { upgrade: 'npx npm-check-updates -u' }),
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
  {
    afterContains: [
      '"biome"',
      '"biome:fix"',
      '"test"',
      '"typecheck"',
      '"knip"',
      '"upgrade"',
      '"release"',
      '"plop"',
      '"check:turbo"',
    ],
    name: 'adds all missing scripts when none exist',
    pkg: scriptPkg('all-missing', {}),
  },
]);
