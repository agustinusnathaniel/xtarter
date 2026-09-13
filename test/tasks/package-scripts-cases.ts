import {
  DEPS,
  defineScriptCases,
  scriptPkg,
  turboPkg,
} from './package-scripts-runner.js';

/**
 * Core `packageScriptsTask` cases, formerly `package-scripts.test.ts`, plus
 * the package-scripts cases that lived in `plop.test.ts`. Fixture rows run
 * against the on-disk fixture, everything else against `withProject`.
 */
export const packageScriptsCases = defineScriptCases(20, [
  {
    applicable: true,
    fixture: 'react-vite-tailwind',
    name: 'is applicable to all projects',
  },
  {
    fixture: 'react-vite-tailwind',
    name: 'returns patch when project has existing scripts',
    status: 'patch',
  },
  {
    afterContains: [
      'biome',
      'biome:fix',
      'test',
      'typecheck',
      'upgrade',
      'release',
      'knip',
      'plop',
    ],
    afterDefined: true,
    afterNotContains: ['ultracite'],
    fixture: 'react-vite-tailwind',
    name: 'dryRun includes package.json diff',
  },
  {
    afterContains: [
      '"biome": "eslint ."',
      '"biome:fix": "biome check --write ."',
    ],
    name: 'preserves existing scripts and only adds missing ones',
    pkg: {
      dependencies: {
        next: '^14.1.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: { typescript: '^5.3.0' },
      name: 'script-conflict',
      scripts: { biome: 'eslint .' },
      type: 'module',
    },
    status: 'patch',
  },
  {
    afterContains: ['"test"'],
    afterNotContains: ['"typecheck"'],
    name: 'skips scripts whose value already exists under a different key',
    pkg: scriptPkg(
      'script-dedup',
      { dev: 'next dev', 'type:check': 'tsc --noEmit' },
      DEPS.ts
    ),
    status: 'patch',
  },
  {
    afterContains: ['"biome"', '"release"'],
    afterNotContains: ['"typecheck"', '"knip"'],
    name: 'does not add typecheck or knip for non-TS projects',
    pkg: { name: 'no-ts-project', type: 'module' },
  },
  {
    name: 'does not overwrite existing matching scripts',
    pkg: {
      devDependencies: {
        '@biomejs/biome': '^1.0.0',
        'commit-and-tag-version': '^12.0.0',
        knip: '^5.0.0',
        plop: '^4.0.0',
        typescript: '^5.3.0',
        vitest: '^3.0.0',
      },
      name: 'existing-scripts',
      scripts: {
        biome: 'biome check .',
        'biome:fix': 'biome check --write .',
        knip: 'knip',
        plop: 'plop',
        release: 'commit-and-tag-version',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
        upgrade: 'pnpm up -i -L',
      },
      type: 'module',
    },
    status: 'skip',
  },
  {
    afterContains: [
      '"ultracite:check": "ultracite check"',
      '"ultracite:fix": "ultracite fix"',
      '"typecheck"',
      '"release"',
    ],
    afterNotContains: ['"lint"', '"format"', 'biome'],
    name: 'uses ultracite scripts when Ultracite is installed',
    pkg: {
      devDependencies: { typescript: '^5.3.0', ultracite: '^1.0.0' },
      name: 'ultracite-project',
      type: 'module',
    },
  },
  {
    afterContains: ['"test"'],
    afterNotContains: ['"biome"'],
    name: 'skips biome when existing lint uses biome',
    pkg: scriptPkg('biome-equivalence', { lint: 'biome check .' }, DEPS.biome),
    status: 'patch',
  },
  {
    afterContains: ['"biome"'],
    afterNotContains: ['"upgrade"'],
    extraFiles: { 'pnpm-lock.yaml': '' },
    name: 'skips upgrade when existing up-latest uses same tool',
    pkg: {
      name: 'upgrade-equivalence',
      scripts: { 'up-latest': 'pnpm up -i -L' },
      type: 'module',
    },
    status: 'patch',
  },
  {
    afterNotContains: ['"build"'],
    name: 'skips when same script via different PM reference',
    pkg: {
      name: 'pm-script-ref',
      scripts: { dev: 'next dev', 'npm:build': 'turbo run build' },
      type: 'module',
    },
    status: 'patch',
  },
  {
    afterNotContains: [
      '"biome"',
      '"biome:fix"',
      '"lint": "vp',
      '"check"',
      '"fix"',
    ],
    name: 'does not add lint scripts when ESLint is detected',
    pkg: scriptPkg('eslint-only', { lint: 'eslint .' }, DEPS.eslint),
    status: 'patch',
  },
  {
    afterContains: ['"biome"'],
    name: 'does not skip same tool with different arguments',
    pkg: scriptPkg(
      'diff-args',
      { 'biome:check': 'biome check src/' },
      DEPS.biome
    ),
    status: 'patch',
  },
  {
    afterContains: ['"check:turbo"'],
    name: 'keeps check:turbo when existing has same tasks but adds other scripts',
    pkg: turboPkg('turbo-same', {
      'check:turbo': 'turbo run biome typecheck test',
    }),
    status: 'patch',
  },
  {
    afterContains: ['"biome"'],
    name: 'adds missing scripts when check:turbo exists with different tasks',
    pkg: turboPkg('turbo-diff', { 'check:turbo': 'turbo run lint build' }),
    status: 'patch',
  },
  {
    afterContains: ['"check:turbo"', 'turbo run lint typecheck test'],
    name: 'uses existing script keys in check:turbo when available',
    pkg: scriptPkg('turbo-refs-existing', {
      lint: 'biome check .',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    }),
  },
  {
    afterContains: [
      '"typecheck"',
      '"check:turbo"',
      'turbo run lint typecheck test',
    ],
    name: 'only adds missing scripts and builds check:turbo from all refs',
    pkg: scriptPkg('turbo-partial', {
      lint: 'biome check .',
      test: 'vitest run',
    }),
  },
  {
    afterContains: [
      '"typecheck"',
      '"test"',
      '"check:turbo"',
      'turbo run lint typecheck test',
    ],
    afterNotContains: ['"biome"'],
    name: 'does not duplicate existing biome when lint exists with biome',
    pkg: scriptPkg('no-dup-biome', { lint: 'biome check .' }),
    status: 'patch',
  },
  {
    afterContains: [
      '"ultracite:check": "ultracite check"',
      '"ultracite:fix": "ultracite fix"',
      '"check:turbo": "turbo run typecheck test"',
    ],
    name: 'omits ultracite from check:turbo when no ultracite script exists',
    pkg: {
      devDependencies: {
        turbo: '^2.0.0',
        typescript: '^5.3.0',
        ultracite: '^1.0.0',
      },
      type: 'module',
    },
  },
  {
    afterContains: [
      '"check:turbo": "turbo run ultracite:check typecheck test"',
    ],
    name: 'references ultracite:check in check:turbo when it already exists',
    pkg: {
      devDependencies: {
        turbo: '^2.0.0',
        typescript: '^5.3.0',
        ultracite: '^1.0.0',
      },
      scripts: { 'ultracite:check': 'ultracite check' },
      type: 'module',
    },
  },
]);

/**
 * package-scripts cases that lived in `plop.test.ts`, kept under their
 * original `plopTask` describe chain by the suite.
 */
export const packageScriptsPlopCases = defineScriptCases(4, [
  {
    afterContains: [
      '"lint": "vp lint"',
      '"check": "vp check"',
      '"fix": "vp check --fix"',
    ],
    afterNotContains: ['"biome"', '"biome:fix"'],
    name: 'uses vp scripts when Vite+ detected and no existing biome',
    pkg: {
      devDependencies: { typescript: '^5.3.0', 'vite-plus': '^0.1.0' },
      name: 'viteplus-nobiome',
      type: 'module',
    },
  },
  {
    afterContains: [
      '"biome": "biome check ."',
      '"biome:fix": "biome check --write ."',
    ],
    afterNotContains: ['"lint": "vp lint"'],
    name: 'keeps biome scripts when Vite+ detected but biome dep already present',
    pkg: {
      devDependencies: {
        '@biomejs/biome': '^2.4.0',
        typescript: '^5.3.0',
        'vite-plus': '^0.1.0',
      },
      name: 'viteplus-biome',
      type: 'module',
    },
  },
  {
    afterNotContains: ['"biome"', '"lint": "vp lint"', '"check"', '"fix"'],
    name: 'skips lint scripts when ESLint is already set up',
    pkg: scriptPkg('eslint-project', { lint: 'eslint .' }, DEPS.eslintTs),
  },
  {
    afterContains: [
      '"lint": "oxlint --import-plugin"',
      '"check": "oxlint --import-plugin && oxfmt --check"',
      '"fix": "oxlint --fix --import-plugin && oxfmt"',
    ],
    afterNotContains: ['"biome"', '"vp '],
    extraFiles: { '.oxlintrc.json': { rules: { 'no-console': 'error' } } },
    name: 'uses direct oxlint scripts when oxlint config exists without Vite+',
    pkg: scriptPkg('oxlint-standalone', undefined, DEPS.ts),
  },
]);
