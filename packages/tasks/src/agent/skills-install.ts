import type { ProjectProfile } from '@xtarterize/core';
import {
  fileExists,
  readPackageJson,
  resolvePath,
  TaskError,
} from '@xtarterize/core';
import { x } from 'tinyexec';

import { getSkillsToInstall, type SkillEntry } from '@/agent/catalog.js';
import { defineTask } from '@/factory/define-task.js';

function getAllDeps(pkg: Record<string, unknown>): Record<string, string> {
  const deps: Record<string, string> = {};
  if (
    typeof pkg.dependencies === 'object' &&
    pkg.dependencies !== null &&
    !Array.isArray(pkg.dependencies)
  ) {
    Object.assign(deps, pkg.dependencies as Record<string, string>);
  }
  if (
    typeof pkg.devDependencies === 'object' &&
    pkg.devDependencies !== null &&
    !Array.isArray(pkg.devDependencies)
  ) {
    Object.assign(deps, pkg.devDependencies as Record<string, string>);
  }
  return deps;
}

async function isDirNonEmpty(dirPath: string): Promise<boolean> {
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(dirPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function readSkillsFromDir(skillsDir: string): Promise<Set<string>> {
  const installed = new Set<string>();
  if (!(await fileExists(skillsDir))) {
    return installed;
  }

  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = resolvePath(skillsDir, entry.name);
        const hasContent = await isDirNonEmpty(skillPath);
        if (hasContent) {
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
  profile: ProjectProfile
): Promise<{ missing: Array<SkillEntry>; total: number }> {
  const pkg = await readPackageJson(cwd);
  const deps = pkg ? getAllDeps(pkg as Record<string, unknown>) : {};
  const skills = getSkillsToInstall(profile, deps);
  if (skills.length === 0) {
    return { missing: [], total: 0 };
  }

  const installed = await getInstalledSkills(cwd);
  return {
    missing: skills.filter((s) => !installed.has(s.skill)),
    total: skills.length,
  };
}

function groupBySource(skills: Array<SkillEntry>): Map<string, Array<string>> {
  const grouped = new Map<string, Set<string>>();
  for (const { source, skill } of skills) {
    const existing = grouped.get(source) ?? new Set<string>();
    existing.add(skill);
    grouped.set(source, existing);
  }

  const normalized = new Map<string, Array<string>>();
  for (const [source, skillSet] of grouped) {
    normalized.set(source, [...skillSet]);
  }
  return normalized;
}

export const skillsInstallTask = defineTask({
  actions: [
    {
      async check(cwd, profile) {
        const { missing, total } = await resolveMissingSkills(cwd, profile);
        if (missing.length === 0) {
          return 'skip';
        }
        return missing.length === total ? 'new' : 'patch';
      },
      kind: 'action',
      async run(cwd, profile) {
        const { missing } = await resolveMissingSkills(cwd, profile);
        const grouped = groupBySource(missing);
        for (const [source, skillNames] of grouped) {
          const args = [
            '--yes',
            'skills@latest',
            'add',
            source,
            ...skillNames.flatMap((s) => ['--skill', s]),
            '-y',
          ];
          const result = await x('npx', args, {
            nodeOptions: { cwd, stdio: 'inherit' },
            timeout: 60_000,
          });
          if (result.exitCode !== 0) {
            throw new TaskError({
              message: `Failed to install skills from ${source}: ${skillNames.join(', ')}`,
              taskId: 'skillsInstallTask.run',
            });
          }
        }
      },
    },
  ],
  applicable: (profile) => profile.typescript,
  group: 'Agent',
  id: 'agent/skills-install',
  label: 'Install agent skills',
  scope: 'both',

  searchMeta: {
    configTargets: [],
    keywords: [
      'skills',
      'agent skills',
      'ai tools',
      'opencode skills',
      'install',
    ],
    tags: ['ai', 'agent', 'skills', 'setup', 'tools'],
  },
});
