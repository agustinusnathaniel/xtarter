import { sharedConfigPackage } from '@xtarter/config';
import type { ProjectProfile } from '@xtarterize/core';
import { fileExists, readFile } from '@xtarterize/core';

import type { DepResolver, TaskDep } from '@/factory/define-task.js';
import { resolveTaskFile } from '@/factory/utils.js';

/**
 * How a lint or format config carries the xtarter rules: `managed` extends
 * `@xtarter/config`, `ejected` writes the whole layer into the project's file.
 * The form is chosen only when the file is first written; after that the file
 * itself says which form it is (ADR-043).
 */
export type LintConfigForm = 'managed' | 'ejected';

export interface LintTaskOptions {
  /** Write the ejected form when a config is created. */
  eject?: boolean;
}

export function newConfigForm(options: LintTaskOptions): LintConfigForm {
  return options.eject === true ? 'ejected' : 'managed';
}

/** True when the config text extends or imports the shared package. */
export function isManagedConfig(text: string): boolean {
  return text.includes(`${sharedConfigPackage}/`);
}

const sharedConfigDep: TaskDep = { depName: sharedConfigPackage, dev: true };

async function readTargetText(
  cwd: string,
  filepath: string,
  extensions: Array<string>
): Promise<string | null> {
  const fullPath = await resolveTaskFile(cwd, filepath, extensions);
  if (fullPath === null || !(await fileExists(fullPath))) {
    return null;
  }
  return readFile(fullPath);
}

/** The file a lint task's dependencies are read from, and how it shows managed. */
export interface LintDepsFile {
  extensions: Array<string>;
  filepath: string;
  isManaged?: (text: string) => boolean;
}

/**
 * Dependencies for a lint task whose managed form also needs the shared
 * package. The written text decides: a pending diff's content when there is
 * one, otherwise the file on disk.
 */
export function lintTaskDeps(
  base: Array<TaskDep>,
  resolveFile: (profile: ProjectProfile) => LintDepsFile
): DepResolver {
  return async (resolution, { cwd, profile }) => {
    const file = resolveFile(profile);
    const pending = resolution.diffs[0]?.after;
    const text =
      pending ?? (await readTargetText(cwd, file.filepath, file.extensions));
    const isManaged = file.isManaged ?? isManagedConfig;
    return text !== null && isManaged(text) ? [...base, sharedConfigDep] : base;
  };
}
