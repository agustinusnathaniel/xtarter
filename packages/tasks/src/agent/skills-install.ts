import { readdir } from 'node:fs/promises';
import type {
  PackageManager,
  ProjectProfile,
  Task,
  TaskChoices,
  TaskStatus,
} from '@xtarterize/core';
import {
  collectDependencyVersions,
  fileExists,
  ProcessRunner,
  readPackageJson,
  resolvePath,
  TaskError,
  toTaskEffect,
} from '@xtarterize/core';
import { Duration, Effect } from 'effect';

import { getSkillsToInstall, type SkillEntry } from '@/agent/catalog.js';
import { defineTask } from '@/factory/define-task.js';

const SKILLS_PACKAGE = 'skills@latest';

/** The executor prefix a package manager accepts for a dlx-style run. */
export interface SkillsExecutor {
  command: string;
  prefixArgs: ReadonlyArray<string>;
}

/**
 * npm 11 rejects `npx` when `devEngines.packageManager` names another package
 * manager (EBADDEVENGINES), and `quality/package-engines` writes that field
 * during `init`. Projects on another package manager therefore go through their
 * own dlx equivalent. Yarn classic has no `dlx` command, so it keeps the `npx`
 * fallback: that stays the best available behavior, but npm 11 will still
 * refuse it when the project's devEngines name is not npm.
 */
export function resolveSkillsExecutor(
  packageManager: PackageManager,
  options: { yarnBerry: boolean }
): SkillsExecutor {
  switch (packageManager) {
    case 'pnpm':
      return { command: 'pnpm', prefixArgs: ['dlx', SKILLS_PACKAGE] };
    case 'yarn':
      return options.yarnBerry
        ? { command: 'yarn', prefixArgs: ['dlx', SKILLS_PACKAGE] }
        : { command: 'npx', prefixArgs: ['--yes', SKILLS_PACKAGE] };
    case 'bun':
      return { command: 'bunx', prefixArgs: [SKILLS_PACKAGE] };
    default:
      return { command: 'npx', prefixArgs: ['--yes', SKILLS_PACKAGE] };
  }
}

/** Yarn Berry projects carry `.yarnrc.yml`; Yarn classic does not. */
async function isYarnBerry(cwd: string): Promise<boolean> {
  return fileExists(resolvePath(cwd, '.yarnrc.yml'));
}

async function readSkillsFromDir(skillsDir: string): Promise<Set<string>> {
  const installed = new Set<string>();
  if (!(await fileExists(skillsDir))) {
    return installed;
  }

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = resolvePath(skillsDir, entry.name);
        const subEntries = await readdir(skillPath).catch(() => []);
        if (subEntries.length > 0) {
          installed.add(entry.name);
        }
      }
    }
  } catch {
    // ignore read errors
  }

  return installed;
}

/** A project skill counts as installed only when its directory has content. */
async function getInstalledSkills(cwd: string): Promise<Set<string>> {
  const projectDirs = [
    resolvePath(cwd, '.agents', 'skills'),
    resolvePath(cwd, '.claude', 'skills'),
    resolvePath(cwd, '.cursor', 'skills'),
  ];

  const installed = new Set<string>();
  for (const dir of projectDirs) {
    for (const skill of await readSkillsFromDir(dir)) {
      installed.add(skill);
    }
  }
  return installed;
}

/** Read package.json once and project which catalog skills are still missing. */
async function resolveMissingSkills(
  cwd: string,
  profile: ProjectProfile,
  selected?: ReadonlySet<string>
): Promise<{ missing: Array<SkillEntry>; total: number }> {
  const pkg = await readPackageJson(cwd);
  const deps = collectDependencyVersions(pkg);
  const applicable = getSkillsToInstall(profile, deps);
  const scoped =
    selected === undefined
      ? applicable
      : applicable.filter((s) => selected.has(s.skill));
  if (scoped.length === 0) {
    return { missing: [], total: 0 };
  }

  const installed = await getInstalledSkills(cwd);
  return {
    missing: scoped.filter((s) => !installed.has(s.skill)),
    total: scoped.length,
  };
}

function groupBySource(skills: Array<SkillEntry>): Map<string, Array<string>> {
  const grouped = new Map<string, Array<string>>();
  for (const { source, skill } of skills) {
    const skillNames = grouped.get(source) ?? [];
    if (!skillNames.includes(skill)) {
      skillNames.push(skill);
    }
    grouped.set(source, skillNames);
  }
  return grouped;
}

async function checkSkills(
  cwd: string,
  profile: ProjectProfile,
  selected?: ReadonlySet<string>
): Promise<TaskStatus> {
  const { missing, total } = await resolveMissingSkills(cwd, profile, selected);
  if (missing.length === 0) {
    return 'skip';
  }
  return missing.length === total ? 'new' : 'patch';
}

function runSkills(
  cwd: string,
  profile: ProjectProfile,
  selected?: ReadonlySet<string>
) {
  return Effect.gen(function* () {
    const { missing } = yield* toTaskEffect('skillsInstallTask.run', () =>
      resolveMissingSkills(cwd, profile, selected)
    );
    const runner = yield* ProcessRunner;
    const yarnBerry =
      profile.packageManager === 'yarn' &&
      (yield* toTaskEffect('skillsInstallTask.run', () => isYarnBerry(cwd)));
    const executor = resolveSkillsExecutor(profile.packageManager, {
      yarnBerry,
    });
    const grouped = groupBySource(missing);
    for (const [source, skillNames] of grouped) {
      const args = [
        ...executor.prefixArgs,
        'add',
        source,
        ...skillNames.flatMap((s) => ['--skill', s]),
        '-y',
      ];
      const result = yield* Effect.mapError(
        runner.run(executor.command, args, {
          cwd,
          stdio: 'inherit',
          timeout: Duration.millis(60_000),
        }),
        (cause) =>
          new TaskError({
            cause: cause.cause ?? cause,
            message: cause.message,
            taskId: 'skillsInstallTask.run',
          })
      );
      if (result.exitCode !== 0) {
        return yield* Effect.fail(
          new TaskError({
            message: `Failed to install skills from ${source}: ${skillNames.join(', ')}`,
            taskId: 'skillsInstallTask.run',
          })
        );
      }
    }
  });
}

function skillsChoices(selected?: ReadonlySet<string>): TaskChoices {
  return {
    message: 'Select agent skills to install:',
    options: (cwd, profile) =>
      toTaskEffect('skillsInstallTask.choices', async () => {
        const { missing } = await resolveMissingSkills(cwd, profile, selected);
        const grouped: Record<
          string,
          Array<{ label: string; value: string }>
        > = {};
        for (const entry of missing) {
          const options = grouped[entry.group] ?? [];
          options.push({
            label: `${entry.skill} (${entry.source})`,
            value: entry.skill,
          });
          grouped[entry.group] = options;
        }
        return grouped;
      }),
    restrict: (values) => createSkillsInstallTask(new Set(values)),
  };
}

/** The skills task, optionally restricted to a chosen skill subset. */
export function createSkillsInstallTask(selected?: ReadonlySet<string>): Task {
  const base = defineTask({
    actions: [
      {
        check: (cwd, profile) => checkSkills(cwd, profile, selected),
        run: (cwd, profile) => runSkills(cwd, profile, selected),
      },
    ],
    applicable: (profile) => profile.typescript,
    configTargets: [],
    group: 'Agent',
    id: 'agent/skills-install',
    keywords: [
      'skills',
      'agent skills',
      'ai tools',
      'opencode skills',
      'install',
    ],
    label: 'Install agent skills',
    scope: 'both',
    tags: ['ai', 'agent', 'skills', 'setup', 'tools'],
  });
  return { ...base, choices: skillsChoices(selected) };
}

export const skillsInstallTask = createSkillsInstallTask();
