// Runs the root unit and integration suites (test/docs runs in the Docs job). With
// TEST_CHANGED_SINCE set to a git ref, runs only the test files a change since that ref can reach;
// without it, runs them all.
//
// Vitest finds those files by walking imports, which misses two kinds of reach in this repo:
// - apps and packages import each other through their built dist/, which git never sees change,
//   so a change anywhere in a workspace package also counts as a change to its dist/ files;
// - some tests spawn a built CLI instead of importing it, so they run whenever any workspace
//   package changes.
// Files that tests read without importing (fixtures, templates, the lockfile) are listed in
// forceRerunTriggers in vite.config.ts, which makes Vitest run everything.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SUITES = [
  'test/core',
  'test/patchers',
  'test/tasks',
  'test/ui',
  'test/integration',
  'apps/create-xtarter-app/src',
];
const WORKSPACE_ROOTS = ['apps', 'packages'];
const DIST_REFERENCE = /(?:apps|packages)\/[^/'"]+\/dist\//u;

function vitest(args: Array<string>): never {
  const result = spawnSync('vp', ['test', ...args], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

function listFiles(dir: string): Array<string> {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { encoding: 'utf8', recursive: true })
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile());
}

const base = process.env.TEST_CHANGED_SINCE;
if (!base) {
  vitest(['run', ...SUITES]);
}

const changed = execFileSync(
  'git',
  ['diff', '--name-only', '--no-renames', base],
  {
    encoding: 'utf8',
  }
)
  .split('\n')
  .filter(Boolean)
  // The Docs job runs test/docs against the docs app in full.
  .filter((path) => !path.startsWith('apps/docs/'));

const workspaces = WORKSPACE_ROOTS.flatMap((root) =>
  readdirSync(root).map((name) => `${root}/${name}`)
);
const touched = workspaces.filter((dir) =>
  changed.some((path) => path.startsWith(`${dir}/`))
);

const spawning = SUITES.flatMap(listFiles).filter((path) => {
  if (!path.endsWith('.test.ts')) {
    return false;
  }
  const source = readFileSync(path, 'utf8');
  return source.includes('node:child_process') && DIST_REFERENCE.test(source);
});

const related = [
  ...changed,
  ...touched.flatMap((dir) => listFiles(join(dir, 'dist'))),
  ...(touched.length > 0 ? spawning : []),
];

console.log(
  `Changed since ${base}: ${changed.length} files in ${touched.length} workspace packages.`
);
// The docs project needs the docs app's dependencies; the Docs job runs it.
vitest([
  'related',
  '--run',
  '--passWithNoTests',
  '--project',
  'shared',
  '--project',
  'isolated',
  ...related,
]);
