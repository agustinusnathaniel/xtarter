import type { DetectorInputId } from './inputs.js';

type DetectorEntrySpec = {
  detector: 'file' | 'custom';
  id: string;
  inputs: ReadonlyArray<DetectorInputId>;
} & (
  | { existing: 'flag' | 'list'; key: string }
  | { existing?: undefined; key?: undefined }
);

/** Declares a file detector whose single input keys a boolean `existing`. */
function fileFlag<
  const Id extends string,
  const Key extends string,
  const Input extends DetectorInputId,
>(id: Id, key: Key, input: Input) {
  return {
    detector: 'file',
    existing: 'flag',
    id,
    inputs: [input],
    key,
  } as const;
}

/** Declares a custom detector that keys a boolean `existing`. */
function customFlag<
  const Id extends string,
  const Key extends string,
  const Inputs extends ReadonlyArray<DetectorInputId>,
>(id: Id, key: Key, ...inputs: Inputs) {
  return { detector: 'custom', existing: 'flag', id, inputs, key } as const;
}

/** Declares a custom detector that keys a string-list `existing`. */
function customList<
  const Id extends string,
  const Key extends string,
  const Inputs extends ReadonlyArray<DetectorInputId>,
>(id: Id, key: Key, ...inputs: Inputs) {
  return { detector: 'custom', existing: 'list', id, inputs, key } as const;
}

/**
 * Every declared detector entry and the inputs it reads. Entries project into
 * `ProjectProfile.existing`.
 */
export const DETECTOR_ENTRIES = [
  // ── Keyed file detectors ──
  fileFlag('biome', 'biome', 'biome'),
  fileFlag('tsconfig', 'tsconfig', 'tsconfig'),
  fileFlag('renovate', 'renovate', 'renovate'),
  fileFlag('commitlint', 'commitlint', 'commitlint-config'),
  fileFlag('knip', 'knip', 'knip-config'),
  fileFlag('plop', 'plop', 'plopfile'),
  fileFlag('turbo', 'turbo', 'turbo-config'),
  fileFlag('viteConfig', 'viteConfig', 'vite-config'),
  fileFlag('versionrc', 'versionrc', 'versionrc'),
  fileFlag('gitignore', 'gitignore', 'gitignore'),
  fileFlag('vscodeSettings', 'vscodeSettings', 'vscode-settings'),
  // ── Custom detectors ──
  customFlag('eslint', 'eslint', 'eslintrc', 'eslint-config', 'package-json'),
  customFlag('oxlint', 'oxlint', 'oxlintrc', 'oxlint-config'),
  customFlag('oxfmt', 'oxfmt', 'oxfmtrc', 'oxfmt-config'),
  customList('githubWorkflows', 'githubWorkflows', 'github-dir'),
  customFlag('changeset', 'changeset', 'changeset-dir', 'package-json'),
  customFlag('agentsMd', 'agentsMd', 'agents', 'claude'),
] as const satisfies ReadonlyArray<DetectorEntrySpec>;

export type DetectorEntry = (typeof DETECTOR_ENTRIES)[number];
export type FileDetectorEntry = Extract<DetectorEntry, { detector: 'file' }>;
export type CustomDetectorEntry = Extract<
  DetectorEntry,
  { detector: 'custom' }
>;

/** Entries that project into `ProjectProfile.existing`. */
export type ExistingEntry = FileDetectorEntry | CustomDetectorEntry;
export type ExistingKey = ExistingEntry['key'];
export type ExistingValue<E extends ExistingEntry> =
  E['existing'] extends 'list' ? Array<string> : boolean;

/** The `existing` profile shape, derived from the registry's keyed entries. */
export type ExistingConfig = {
  [E in ExistingEntry as E['key']]: ExistingValue<E>;
};

/** Every declared entry projects into `ProjectProfile.existing`. */
export const EXISTING_ENTRIES: ReadonlyArray<ExistingEntry> = DETECTOR_ENTRIES;

export function isFileDetectorEntry(
  entry: DetectorEntry
): entry is FileDetectorEntry {
  return entry.detector === 'file';
}
