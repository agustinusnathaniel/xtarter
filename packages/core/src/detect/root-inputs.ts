import type { ProjectProfile } from './types.js';

/**
 * A root-level file whose existence/content can change the detected
 * ProjectProfile. `extensions` are appended to `basename` to enumerate the
 * candidate file names; an empty array means `basename` is the exact name.
 */
export interface DetectorRootInput {
  basename: string;
  extensions: Array<string>;
  /**
   * Set only for inputs that map directly to a `ProjectProfile.existing`
   * flag. Used by detect.ts to derive its file detector specs from this same
   * list so detection and cache fingerprinting share a single source of
   * truth.
   */
  key?: keyof ProjectProfile['existing'];
}

/**
 * Every root-level file consulted during project detection (file detectors,
 * custom detectors, bundler configs, monorepo markers, node version). The
 * cache fingerprint covers exactly this list, so adding a detector input here
 * automatically keeps the cached profile fresh.
 */
export const ROOT_DETECTOR_INPUTS: Array<DetectorRootInput> = [
  // ── FILE_DETECTORS (detect.ts) ──
  { basename: 'biome', extensions: ['.json', '.jsonc'], key: 'biome' },
  { basename: 'tsconfig', extensions: ['.json', '.jsonc'], key: 'tsconfig' },
  { basename: 'renovate', extensions: ['.json', '.jsonc'], key: 'renovate' },
  {
    basename: 'commitlint.config',
    extensions: ['.ts', '.js', '.mjs', '.mts', '.cts'],
    key: 'commitlint',
  },
  { basename: 'knip', extensions: ['.ts', '.mts'], key: 'knip' },
  { basename: 'plopfile', extensions: ['.ts', '.js', '.mjs'], key: 'plop' },
  { basename: 'turbo', extensions: ['.json'], key: 'turbo' },
  {
    basename: 'vite.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    key: 'viteConfig',
  },
  { basename: '.versionrc', extensions: [], key: 'versionrc' },
  { basename: '.gitignore', extensions: [], key: 'gitignore' },
  // ── CUSTOM_DETECTORS (detect.ts) ──
  {
    basename: '.eslintrc',
    extensions: ['.js', '.cjs', '.json', '.yaml', '.yml'],
  },
  {
    basename: 'eslint.config',
    extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'],
  },
  { basename: '.oxlintrc', extensions: ['.json', '.jsonc'] },
  { basename: 'oxlint.config', extensions: ['.ts', '.js', '.mjs'] },
  { basename: '.oxfmtrc', extensions: ['.json', '.jsonc'] },
  { basename: 'oxfmt.config', extensions: ['.ts', '.js', '.mjs'] },
  { basename: 'AGENTS', extensions: ['.md'] },
  { basename: 'CLAUDE', extensions: ['.md'] },
  // ── Bundler config files (detect/bundler.ts) ──
  {
    basename: 'next.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
  },
  {
    basename: 'rspack.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
  },
  {
    basename: 'webpack.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
  },
  // ── Monorepo marker files (detect/monorepo.ts) ──
  { basename: 'pnpm-workspace', extensions: ['.yaml'] },
  { basename: 'nx', extensions: ['.json'] },
  { basename: 'lerna', extensions: ['.json'] },
  // ── Node version (detectNodeVersion) ──
  { basename: '.nvmrc', extensions: [] },
];
