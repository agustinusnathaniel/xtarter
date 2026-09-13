import type { PackageManager } from '../types.js';

/**
 * Declares the detection inputs that have a runtime consumer: keyed detector
 * entries, doctor lockfile checks, bundler config extensions, and monorepo
 * markers. Detection that reads files directly bypasses this module (ADR 032).
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
  | { id: string; kind: 'packageJson'; name: string };

const JSON_EXTENSIONS = ['.json', '.jsonc'] as const;
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.mjs'] as const;
const BUNDLER_EXTENSIONS = [
  '.ts',
  '.js',
  '.mts',
  '.mjs',
  '.cts',
  '.cjs',
] as const;
const COMMITLINT_EXTENSIONS = ['.ts', '.js', '.mjs', '.mts', '.cts'] as const;
const ESLINTRC_EXTENSIONS = [
  '.js',
  '.cjs',
  '.mjs',
  '.json',
  '.yaml',
  '.yml',
] as const;
const ESLINT_CONFIG_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
] as const;
const MARKDOWN_EXTENSIONS = ['.md'] as const;

/** Declares a root file input. `extensions` are appended to `basename`. */
function rootFile<
  const Id extends string,
  const Basename extends string,
  const Extensions extends ReadonlyArray<string>,
>(id: Id, basename: Basename, ...extensions: Extensions) {
  return { basename, extensions, id, kind: 'rootFile' } as const;
}

function configDir<const Id extends string, const Dir extends string>(
  id: Id,
  dir: Dir
) {
  return { dir, id, kind: 'configDir' } as const;
}

function lockfile<
  const Id extends string,
  const Name extends string,
  const Manager extends PackageManager,
>(id: Id, name: Name, packageManager: Manager) {
  return { id, kind: 'lockfile', name, packageManager } as const;
}

/** Declares an ancestor marker file. Detection looks for these on the way up. */
function monorepoMarker<const Id extends string, const Name extends string>(
  id: Id,
  name: Name
) {
  return {
    id,
    kind: 'ancestorMarker',
    name,
    role: 'monorepoMarker',
    type: 'file',
  } as const;
}

/** Declares an ancestor workspace directory, such as `packages/` or `apps/`. */
function workspaceDir<const Id extends string, const Name extends string>(
  id: Id,
  name: Name
) {
  return {
    id,
    kind: 'ancestorMarker',
    name,
    role: 'workspaceDir',
    type: 'dir',
  } as const;
}

/**
 * Declares an input by id. `extensions` are appended to `basename` to
 * enumerate candidate file names; an empty array means `basename` is exact.
 */
export const DETECTOR_INPUTS = [
  // ── Root files ──
  rootFile('biome', 'biome', ...JSON_EXTENSIONS),
  rootFile('tsconfig', 'tsconfig', ...JSON_EXTENSIONS),
  rootFile('renovate', 'renovate', ...JSON_EXTENSIONS),
  rootFile('commitlint-config', 'commitlint.config', ...COMMITLINT_EXTENSIONS),
  rootFile('knip-config', 'knip', '.ts', '.mts'),
  rootFile('plopfile', 'plopfile', ...SCRIPT_EXTENSIONS),
  rootFile('turbo-config', 'turbo', '.json'),
  rootFile('vite-config', 'vite.config', ...BUNDLER_EXTENSIONS),
  rootFile('next-config', 'next.config', ...BUNDLER_EXTENSIONS),
  rootFile('rspack-config', 'rspack.config', ...BUNDLER_EXTENSIONS),
  rootFile('webpack-config', 'webpack.config', ...BUNDLER_EXTENSIONS),
  rootFile('vscode-settings', '.vscode/settings', '.json'),
  rootFile('versionrc', '.versionrc'),
  rootFile('gitignore', '.gitignore'),
  rootFile('eslintrc', '.eslintrc', ...ESLINTRC_EXTENSIONS),
  rootFile('eslint-config', 'eslint.config', ...ESLINT_CONFIG_EXTENSIONS),
  rootFile('oxlintrc', '.oxlintrc', ...JSON_EXTENSIONS),
  rootFile('oxlint-config', 'oxlint.config', ...SCRIPT_EXTENSIONS),
  rootFile('oxfmtrc', '.oxfmtrc', ...JSON_EXTENSIONS),
  rootFile('oxfmt-config', 'oxfmt.config', ...SCRIPT_EXTENSIONS),
  rootFile('agents', 'AGENTS', ...MARKDOWN_EXTENSIONS),
  rootFile('claude', 'CLAUDE', ...MARKDOWN_EXTENSIONS),
  // ── Config directories ──
  configDir('github-dir', '.github'),
  configDir('changeset-dir', '.changeset'),
  // ── Lockfiles ──
  lockfile('pnpm-lock', 'pnpm-lock.yaml', 'pnpm'),
  lockfile('yarn-lock', 'yarn.lock', 'yarn'),
  lockfile('bun-lockb', 'bun.lockb', 'bun'),
  lockfile('bun-lock', 'bun.lock', 'bun'),
  lockfile('npm-lock', 'package-lock.json', 'npm'),
  // ── Ancestor markers ──
  monorepoMarker('monorepo-pnpm-workspace', 'pnpm-workspace.yaml'),
  monorepoMarker('monorepo-turbo', 'turbo.json'),
  monorepoMarker('monorepo-nx', 'nx.json'),
  monorepoMarker('monorepo-lerna', 'lerna.json'),
  workspaceDir('workspace-packages', 'packages'),
  workspaceDir('workspace-apps', 'apps'),
  workspaceDir('workspace-services', 'services'),
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

export function lockfileInputs(): Array<LockfileInput> {
  return inputsOfKind('lockfile');
}

export function ancestorMarkerInputs(): Array<AncestorMarkerInput> {
  return inputsOfKind('ancestorMarker');
}

/** The root file input declared with `basename`, if any. */
export function rootFileInputByBasename(
  basename: string
): RootFileInput | undefined {
  return inputsOfKind('rootFile').find((input) => input.basename === basename);
}
