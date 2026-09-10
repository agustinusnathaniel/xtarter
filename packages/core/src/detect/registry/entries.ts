import type { DetectorInputId } from './inputs.js';

type DetectorEntrySpec = {
  detector: 'file' | 'custom' | 'logic';
  id: string;
  inputs: ReadonlyArray<DetectorInputId>;
} & (
  | { existing: 'flag' | 'list'; key: string }
  | { existing?: undefined; key?: undefined }
);

/**
 * Every detector and the inputs it reads. Keyed entries project into
 * `ProjectProfile.existing`; logic entries feed the computed profile fields
 * and exist so the fingerprint covers their inputs.
 */
export const DETECTOR_ENTRIES = [
  // ── Keyed file detectors ──
  {
    detector: 'file',
    existing: 'flag',
    id: 'biome',
    inputs: ['biome'],
    key: 'biome',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'tsconfig',
    inputs: ['tsconfig'],
    key: 'tsconfig',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'renovate',
    inputs: ['renovate'],
    key: 'renovate',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'commitlint',
    inputs: ['commitlint-config'],
    key: 'commitlint',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'knip',
    inputs: ['knip-config'],
    key: 'knip',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'plop',
    inputs: ['plopfile'],
    key: 'plop',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'turbo',
    inputs: ['turbo-config'],
    key: 'turbo',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'viteConfig',
    inputs: ['vite-config'],
    key: 'viteConfig',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'versionrc',
    inputs: ['versionrc'],
    key: 'versionrc',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'gitignore',
    inputs: ['gitignore'],
    key: 'gitignore',
  },
  {
    detector: 'file',
    existing: 'flag',
    id: 'vscodeSettings',
    inputs: ['vscode-settings'],
    key: 'vscodeSettings',
  },
  // ── Custom detectors ──
  {
    detector: 'custom',
    existing: 'flag',
    id: 'eslint',
    inputs: ['eslintrc', 'eslint-config', 'package-json'],
    key: 'eslint',
  },
  {
    detector: 'custom',
    existing: 'flag',
    id: 'oxlint',
    inputs: ['oxlintrc', 'oxlint-config'],
    key: 'oxlint',
  },
  {
    detector: 'custom',
    existing: 'flag',
    id: 'oxfmt',
    inputs: ['oxfmtrc', 'oxfmt-config'],
    key: 'oxfmt',
  },
  {
    detector: 'custom',
    existing: 'list',
    id: 'githubWorkflows',
    inputs: ['github-dir'],
    key: 'githubWorkflows',
  },
  {
    detector: 'custom',
    existing: 'flag',
    id: 'changeset',
    inputs: ['changeset-dir', 'package-json'],
    key: 'changeset',
  },
  {
    detector: 'custom',
    existing: 'flag',
    id: 'agentsMd',
    inputs: ['agents', 'claude'],
    key: 'agentsMd',
  },
  // ── Logic detectors ──
  { detector: 'logic', id: 'framework', inputs: ['package-json'] },
  {
    detector: 'logic',
    id: 'bundler',
    inputs: [
      'package-json',
      'next-config',
      'vite-config',
      'rspack-config',
      'webpack-config',
    ],
  },
  { detector: 'logic', id: 'router', inputs: ['package-json'] },
  { detector: 'logic', id: 'styling', inputs: ['package-json'] },
  { detector: 'logic', id: 'runtime', inputs: ['package-json'] },
  { detector: 'logic', id: 'vitePlus', inputs: ['package-json'] },
  {
    detector: 'logic',
    id: 'packageManager',
    inputs: [
      'package-json',
      'pnpm-lock',
      'yarn-lock',
      'bun-lock',
      'bun-lockb',
      'npm-lock',
    ],
  },
  {
    detector: 'logic',
    id: 'monorepo',
    inputs: [
      'pnpm-workspace',
      'turbo-config',
      'nx-config',
      'lerna-config',
      'monorepo-pnpm-workspace',
      'monorepo-turbo',
      'monorepo-nx',
      'monorepo-lerna',
      'workspace-packages',
      'workspace-apps',
      'workspace-services',
    ],
  },
  {
    detector: 'logic',
    id: 'nodeVersion',
    inputs: ['nvmrc', 'package-json'],
  },
] as const satisfies ReadonlyArray<DetectorEntrySpec>;

export type DetectorEntry = (typeof DETECTOR_ENTRIES)[number];
export type FileDetectorEntry = Extract<DetectorEntry, { detector: 'file' }>;
export type CustomDetectorEntry = Extract<
  DetectorEntry,
  { detector: 'custom' }
>;
export type LogicDetectorEntry = Extract<DetectorEntry, { detector: 'logic' }>;

/** Entries that project into `ProjectProfile.existing`. */
export type ExistingEntry = FileDetectorEntry | CustomDetectorEntry;
export type FlagEntry = Extract<ExistingEntry, { existing: 'flag' }>;
export type ListEntry = Extract<ExistingEntry, { existing: 'list' }>;
export type ExistingKey = ExistingEntry['key'];
export type ExistingValue<E extends ExistingEntry> =
  E['existing'] extends 'list' ? Array<string> : boolean;

/** The `existing` profile shape, derived from the registry's keyed entries. */
export type ExistingConfig = {
  [E in ExistingEntry as E['key']]: ExistingValue<E>;
};

export const EXISTING_ENTRIES: ReadonlyArray<ExistingEntry> =
  DETECTOR_ENTRIES.filter(
    (entry): entry is ExistingEntry => entry.detector !== 'logic'
  );

export function isFileDetectorEntry(
  entry: DetectorEntry
): entry is FileDetectorEntry {
  return entry.detector === 'file';
}

export function isCustomDetectorEntry(
  entry: DetectorEntry
): entry is CustomDetectorEntry {
  return entry.detector === 'custom';
}
