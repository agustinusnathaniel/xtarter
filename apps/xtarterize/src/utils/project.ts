import type { ProjectProfile, Task } from '@xtarterize/core';
import {
  collectDependencyVersions,
  detectProject,
  pc,
  readPackageJson,
  resolveExternalTasks,
  TaskError,
} from '@xtarterize/core';
import { getAllTasks } from '@xtarterize/tasks';
import { Effect } from 'effect';

import { type PromptError, Prompter } from '@/ui/prompter.js';
import { formatFailureText } from '@/utils/failure-text.js';

/**
 * Combine built-in tasks with external plugin tasks.
 * External tasks are loaded from the project's plugin config
 * (`.xtarterizerc` or `"xtarterize"` key in `package.json`).
 */
export function getAllTasksWithPlugins(
  cwd: string
): Effect.Effect<Array<Task>> {
  return Effect.gen(function* () {
    const internal = getAllTasks();
    const external = yield* resolveExternalTasks(cwd);
    return external.length > 0 ? [...internal, ...external] : internal;
  });
}

export interface DetectProjectWithAmbiguityOptions {
  baseProfile?: ProjectProfile;
  cwd: string;
  quiet: boolean;
}

function liftProjectLeaf<A>(
  taskId: string,
  run: () => Promise<A>
): Effect.Effect<A, TaskError> {
  return Effect.tryPromise({
    catch: (cause) =>
      new TaskError({
        cause,
        message: formatFailureText(cause),
        taskId,
      }),
    try: run,
  });
}

export function detectProjectWithAmbiguity(
  options: DetectProjectWithAmbiguityOptions
): Effect.Effect<ProjectProfile, PromptError | TaskError, Prompter> {
  return Effect.gen(function* () {
    const { cwd, quiet, baseProfile } = options;
    let profile =
      baseProfile ??
      (yield* liftProjectLeaf('detect-project', () => detectProject(cwd)));

    if (profile.framework === null && !quiet) {
      const pkg = yield* liftProjectLeaf('read-package-json', () =>
        readPackageJson(cwd)
      );
      const allDeps = collectDependencyVersions(pkg);

      const hasReactNative = !!(allDeps['react-native'] || allDeps.expo);
      const hasReact = !!allDeps.react;

      if (hasReactNative && hasReact) {
        const resolved = yield* resolveAmbiguousFramework();
        // A cancelled prompt keeps the detected profile: framework stays null
        // instead of exiting the process.
        if (resolved !== null) {
          profile = { ...profile, framework: resolved };
        }
      }
    }

    return profile;
  });
}

export function printProjectProfile(profile: ProjectProfile): void {
  console.log('');
  console.log(`${pc.bold(`Framework: ${profile.framework ?? 'none'}`)}`);
  console.log(`${pc.bold(`Bundler: ${profile.bundler ?? 'none'}`)}`);
  console.log(`${pc.bold(`Package Manager: ${profile.packageManager}`)}`);
  console.log('');
}

function resolveAmbiguousFramework(): Effect.Effect<
  'react' | 'react-native' | 'node' | null,
  PromptError,
  Prompter
> {
  return Effect.flatMap(Prompter, (prompter) =>
    prompter.select<'react' | 'react-native' | 'node'>({
      message:
        'Detected both React and React Native dependencies. Which best describes this project?',
      options: [
        { label: 'React (web)', value: 'react' },
        { label: 'React Native / Expo (mobile)', value: 'react-native' },
        {
          label: 'Universal (web + native, treating as Node)',
          value: 'node',
        },
      ],
    })
  );
}
