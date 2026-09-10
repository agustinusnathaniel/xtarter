import type { PackageManager } from '../types.js';

/**
 * The detection registry is the single declaration of what project detection
 * reads. The fingerprint, doctor lockfile checks, cache validation, and the
 * `existing` profile keys all derive from this module (ADR 032).
 */

type DetectorInputSpec =
  | {
      basename: string;
      extensions: ReadonlyArray<string>;
      id: string;
      kind: 'rootFile';
    }
  | { dir: string; id: string; kind: 'configDir' }
  | {
      id: string;
      kind: 'lockfile';
      name: string;
      packageManager: PackageManager;
    }
  | {
      id: string;
      kind: 'ancestorMarker';
      name: string;
      role: 'monorepoMarker' | 'workspaceDir';
      type: 'file' | 'dir';
    }
  | { id: string; kind: 'cwdMarker'; name: string }
  | { id: string; kind: 'packageJson'; name: string };

/**
 * Declares an input by id. `extensions` are appended to `basename` to
 * enumerate candidate file names; an empty array means `basename` is exact.
 */
export const DETECTOR_INPUTS = [
  // ── Root files ──
  {
    basename: 'biome',
    extensions: ['.json', '.jsonc'],
    id: 'biome',
    kind: 'rootFile',
  },
  {
    basename: 'tsconfig',
    extensions: ['.json', '.jsonc'],
    id: 'tsconfig',
    kind: 'rootFile',
  },
  {
    basename: 'renovate',
    extensions: ['.json', '.jsonc'],
    id: 'renovate',
    kind: 'rootFile',
  },
  {
    basename: 'commitlint.config',
    extensions: ['.ts', '.js', '.mjs', '.mts', '.cts'],
    id: 'commitlint-config',
    kind: 'rootFile',
  },
  {
    basename: 'knip',
    extensions: ['.ts', '.mts'],
    id: 'knip-config',
    kind: 'rootFile',
  },
  {
    basename: 'plopfile',
    extensions: ['.ts', '.js', '.mjs'],
    id: 'plopfile',
    kind: 'rootFile',
  },
  {
    basename: 'turbo',
    extensions: ['.json'],
    id: 'turbo-config',
    kind: 'rootFile',
  },
  { basename: 'nx', extensions: ['.json'], id: 'nx-config', kind: 'rootFile' },
  {
    basename: 'lerna',
    extensions: ['.json'],
    id: 'lerna-config',
    kind: 'rootFile',
  },
  {
    basename: 'pnpm-workspace',
    extensions: ['.yaml'],
    id: 'pnpm-workspace',
    kind: 'rootFile',
  },
  {
    basename: 'vite.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    id: 'vite-config',
    kind: 'rootFile',
  },
  {
    basename: 'next.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    id: 'next-config',
    kind: 'rootFile',
  },
  {
    basename: 'rspack.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    id: 'rspack-config',
    kind: 'rootFile',
  },
  {
    basename: 'webpack.config',
    extensions: ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    id: 'webpack-config',
    kind: 'rootFile',
  },
  {
    basename: '.vscode/settings',
    extensions: ['.json'],
    id: 'vscode-settings',
    kind: 'rootFile',
  },
  { basename: '.versionrc', extensions: [], id: 'versionrc', kind: 'rootFile' },
  { basename: '.gitignore', extensions: [], id: 'gitignore', kind: 'rootFile' },
  { basename: '.nvmrc', extensions: [], id: 'nvmrc', kind: 'rootFile' },
  {
    basename: '.eslintrc',
    extensions: ['.js', '.cjs', '.mjs', '.json', '.yaml', '.yml'],
    id: 'eslintrc',
    kind: 'rootFile',
  },
  {
    basename: 'eslint.config',
    extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'],
    id: 'eslint-config',
    kind: 'rootFile',
  },
  {
    basename: '.oxlintrc',
    extensions: ['.json', '.jsonc'],
    id: 'oxlintrc',
    kind: 'rootFile',
  },
  {
    basename: 'oxlint.config',
    extensions: ['.ts', '.js', '.mjs'],
    id: 'oxlint-config',
    kind: 'rootFile',
  },
  {
    basename: '.oxfmtrc',
    extensions: ['.json', '.jsonc'],
    id: 'oxfmtrc',
    kind: 'rootFile',
  },
  {
    basename: 'oxfmt.config',
    extensions: ['.ts', '.js', '.mjs'],
    id: 'oxfmt-config',
    kind: 'rootFile',
  },
  { basename: 'AGENTS', extensions: ['.md'], id: 'agents', kind: 'rootFile' },
  { basename: 'CLAUDE', extensions: ['.md'], id: 'claude', kind: 'rootFile' },
  // ── Config directories ──
  { dir: '.github', id: 'github-dir', kind: 'configDir' },
  { dir: '.vscode', id: 'vscode-dir', kind: 'configDir' },
  { dir: '.changeset', id: 'changeset-dir', kind: 'configDir' },
  // ── Lockfiles ──
  {
    id: 'pnpm-lock',
    kind: 'lockfile',
    name: 'pnpm-lock.yaml',
    packageManager: 'pnpm',
  },
  {
    id: 'yarn-lock',
    kind: 'lockfile',
    name: 'yarn.lock',
    packageManager: 'yarn',
  },
  {
    id: 'bun-lockb',
    kind: 'lockfile',
    name: 'bun.lockb',
    packageManager: 'bun',
  },
  { id: 'bun-lock', kind: 'lockfile', name: 'bun.lock', packageManager: 'bun' },
  {
    id: 'npm-lock',
    kind: 'lockfile',
    name: 'package-lock.json',
    packageManager: 'npm',
  },
  // ── Ancestor markers ──
  {
    id: 'monorepo-pnpm-workspace',
    kind: 'ancestorMarker',
    name: 'pnpm-workspace.yaml',
    role: 'monorepoMarker',
    type: 'file',
  },
  {
    id: 'monorepo-turbo',
    kind: 'ancestorMarker',
    name: 'turbo.json',
    role: 'monorepoMarker',
    type: 'file',
  },
  {
    id: 'monorepo-nx',
    kind: 'ancestorMarker',
    name: 'nx.json',
    role: 'monorepoMarker',
    type: 'file',
  },
  {
    id: 'monorepo-lerna',
    kind: 'ancestorMarker',
    name: 'lerna.json',
    role: 'monorepoMarker',
    type: 'file',
  },
  {
    id: 'workspace-packages',
    kind: 'ancestorMarker',
    name: 'packages',
    role: 'workspaceDir',
    type: 'dir',
  },
  {
    id: 'workspace-apps',
    kind: 'ancestorMarker',
    name: 'apps',
    role: 'workspaceDir',
    type: 'dir',
  },
  {
    id: 'workspace-services',
    kind: 'ancestorMarker',
    name: 'services',
    role: 'workspaceDir',
    type: 'dir',
  },
  // ── Cwd markers ──
  { id: 'git', kind: 'cwdMarker', name: '.git' },
  // ── package.json ──
  { id: 'package-json', kind: 'packageJson', name: 'package.json' },
] as const satisfies ReadonlyArray<DetectorInputSpec>;

export type DetectorInput = (typeof DETECTOR_INPUTS)[number];
export type DetectorInputId = DetectorInput['id'];
export type RootFileInput = Extract<DetectorInput, { kind: 'rootFile' }>;
export type ConfigDirInput = Extract<DetectorInput, { kind: 'configDir' }>;
export type LockfileInput = Extract<DetectorInput, { kind: 'lockfile' }>;
export type AncestorMarkerInput = Extract<
  DetectorInput,
  { kind: 'ancestorMarker' }
>;
export type CwdMarkerInput = Extract<DetectorInput, { kind: 'cwdMarker' }>;
export type PackageJsonInput = Extract<DetectorInput, { kind: 'packageJson' }>;

export function inputById(id: DetectorInputId): DetectorInput {
  const input = DETECTOR_INPUTS.find((candidate) => candidate.id === id);
  if (!input) {
    throw new Error(`Detection registry has no input with id "${id}"`);
  }
  return input;
}

export function inputsOfKind<K extends DetectorInput['kind']>(
  kind: K
): Array<Extract<DetectorInput, { kind: K }>> {
  return DETECTOR_INPUTS.filter(
    (input): input is Extract<DetectorInput, { kind: K }> => input.kind === kind
  );
}

export function rootFileInputs(): Array<RootFileInput> {
  return inputsOfKind('rootFile');
}

export function configDirInputs(): Array<ConfigDirInput> {
  return inputsOfKind('configDir');
}

export function lockfileInputs(): Array<LockfileInput> {
  return inputsOfKind('lockfile');
}

export function ancestorMarkerInputs(): Array<AncestorMarkerInput> {
  return inputsOfKind('ancestorMarker');
}

export function cwdMarkerInputs(): Array<CwdMarkerInput> {
  return inputsOfKind('cwdMarker');
}

export function packageJsonInput(): PackageJsonInput {
  return inputsOfKind('packageJson')[0];
}

/** The root file input declared with `basename`, if any. */
export function rootFileInputByBasename(
  basename: string
): RootFileInput | undefined {
  return rootFileInputs().find((input) => input.basename === basename);
}
