import {
  type DetectorEntry,
  EXISTING_ENTRIES,
  type ExistingConfig,
  type ExistingKey,
  type FileDetectorEntry,
} from './entries.js';
import {
  type AncestorMarkerInput,
  ancestorMarkerInputs,
  type ConfigDirInput,
  type DetectorInput,
  inputById,
  type RootFileInput,
} from './inputs.js';

/** Inputs of one kind referenced by an entry, in declaration order. */
function inputsFor<K extends DetectorInput['kind']>(
  entry: DetectorEntry,
  kind: K
): Array<Extract<DetectorInput, { kind: K }>> {
  return entry.inputs
    .map((inputId) => inputById(inputId))
    .filter(
      (input): input is Extract<DetectorInput, { kind: K }> =>
        input.kind === kind
    );
}

/** Root file inputs referenced by an entry, in declaration order. */
export function rootFileInputsFor(entry: DetectorEntry): Array<RootFileInput> {
  return inputsFor(entry, 'rootFile');
}

/** The single root file input a keyed file detector declares. */
export function rootFileInputFor(entry: FileDetectorEntry): RootFileInput {
  const input = rootFileInputsFor(entry)[0];
  if (!input) {
    throw new Error(
      `File detector "${entry.id}" must declare a root file input`
    );
  }
  return input;
}

/** Config directory inputs referenced by an entry, in declaration order. */
export function configDirInputsFor(
  entry: DetectorEntry
): Array<ConfigDirInput> {
  return inputsFor(entry, 'configDir');
}

/** Monorepo marker files, used by `detect/monorepo.ts`. */
export function monorepoMarkerFiles(): Array<AncestorMarkerInput['name']> {
  return ancestorMarkerInputs()
    .filter((input) => input.role === 'monorepoMarker')
    .map((input) => input.name);
}

/** Workspace package directory names, used by `detect/monorepo.ts`. */
export function workspacePackageDirs(): Array<AncestorMarkerInput['name']> {
  return ancestorMarkerInputs()
    .filter((input) => input.role === 'workspaceDir')
    .map((input) => input.name);
}

export function existingKeys(): Array<ExistingKey> {
  return EXISTING_ENTRIES.map((entry) => entry.key);
}

/**
 * Turn the partially assembled profile into the complete `existing` shape.
 * The registry guarantees every key is produced; the runtime check keeps a
 * malformed assembly from silently landing as a `ProjectProfile`.
 */
export function completeExistingConfig(
  partial: Partial<ExistingConfig>
): ExistingConfig {
  const missing = existingKeys().filter((key) => !(key in partial));
  if (missing.length > 0) {
    throw new Error(
      `Detection produced an incomplete existing config: ${missing.join(', ')}`
    );
  }
  return partial as ExistingConfig;
}
