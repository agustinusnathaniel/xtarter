import type { ProjectProfile, Task } from '@xtarterize/core';
import {
  collectDependencyVersions,
  detectProject,
  pc,
  readPackageJson,
  resolveExternalTasks,
} from '@xtarterize/core';
import { getAllTasks } from '@xtarterize/tasks';

import type { Prompter } from '@/ui/prompter.js';

/**
 * Combine built-in tasks with external plugin tasks.
 * External tasks are loaded from the project's plugin config
 * (`.xtarterizerc` or `"xtarterize"` key in `package.json`).
 */
export async function getAllTasksWithPlugins(
  cwd: string
): Promise<Array<Task>> {
  const internal = getAllTasks();
  const external = await resolveExternalTasks(cwd);
  return external.length > 0 ? [...internal, ...external] : internal;
}

export interface DetectProjectWithAmbiguityOptions {
  baseProfile?: ProjectProfile;
  cwd: string;
  prompter: Prompter;
  quiet: boolean;
}

export async function detectProjectWithAmbiguity(
  options: DetectProjectWithAmbiguityOptions
): Promise<ProjectProfile> {
  const { cwd, quiet, baseProfile, prompter } = options;
  let profile = baseProfile ?? (await detectProject(cwd));

  if (profile.framework === null && !quiet) {
    const pkg = await readPackageJson(cwd);
    const allDeps = collectDependencyVersions(pkg);

    const hasReactNative = !!(allDeps['react-native'] || allDeps.expo);
    const hasReact = !!allDeps.react;

    if (hasReactNative && hasReact) {
      const resolved = await resolveAmbiguousFramework(prompter);
      // A cancelled prompt keeps the detected profile: framework stays null
      // instead of exiting the process.
      if (resolved !== null) {
        profile = { ...profile, framework: resolved };
      }
    }
  }

  return profile;
}

export function printProjectProfile(profile: ProjectProfile): void {
  console.log('');
  console.log(`${pc.bold(`Framework: ${profile.framework ?? 'none'}`)}`);
  console.log(`${pc.bold(`Bundler: ${profile.bundler ?? 'none'}`)}`);
  console.log(`${pc.bold(`Package Manager: ${profile.packageManager}`)}`);
  console.log('');
}

async function resolveAmbiguousFramework(
  prompter: Prompter
): Promise<'react' | 'react-native' | 'node' | null> {
  return prompter.select<'react' | 'react-native' | 'node'>({
    message:
      'Detected both React and React Native dependencies. Which best describes this project?',
    options: [
      { label: 'React (web)', value: 'react' },
      { label: 'React Native / Expo (mobile)', value: 'react-native' },
      { label: 'Universal (web + native, treating as Node)', value: 'node' },
    ],
  });
}
