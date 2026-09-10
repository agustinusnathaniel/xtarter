import type { ProjectProfile } from '@xtarterize/core';
import { readPackageJson } from '@xtarterize/core';

import { defineTask } from '@/factory/define-task.js';

interface TurboTaskConfig {
  cache?: boolean;
  dependsOn?: Array<string>;
  inputs?: Array<string>;
  outputs?: Array<string>;
  persistent?: boolean;
}

interface TurboJsonTemplate {
  $schema: string;
  tasks: Record<string, TurboTaskConfig>;
}

function getBuildOutputs(profile: ProjectProfile): Array<string> {
  if (profile.bundler === 'nextjs') {
    return ['.next/**', '!.next/cache/**', 'public/**'];
  }
  return ['dist/**'];
}

function buildTurboJson(
  scripts: Array<string>,
  profile: ProjectProfile
): TurboJsonTemplate {
  const tasks: Record<string, TurboTaskConfig> = {};

  const turboTasks: Record<string, TurboTaskConfig> = {
    biome: { dependsOn: ['^biome'] },
    build: { dependsOn: ['^build'], outputs: getBuildOutputs(profile) },
    dev: { cache: false, persistent: true },
    test: { dependsOn: ['^build'] },
    typecheck: { dependsOn: ['^typecheck'] },
  };

  for (const [taskName, config] of Object.entries(turboTasks)) {
    if (scripts.includes(taskName)) {
      tasks[taskName] = config;
    }
  }

  return {
    $schema: 'https://turbo.build/schema.json',
    tasks,
  };
}

export const turboTask = defineTask({
  applicable: (profile) =>
    profile.monorepoTool === 'turbo' || profile.existing.turbo,
  deps: [{ depName: 'turbo', dev: true }],
  group: 'Monorepo',
  id: 'monorepo/turbo',
  label: 'Turbo',
  scope: 'root',
  searchMeta: {
    keywords: [
      'turbo',
      'turborepo',
      'monorepo',
      'build cache',
      'task orchestration',
    ],
    tags: ['monorepo', 'build', 'orchestration', 'caching'],
  },
  targets: [
    {
      filepath: 'turbo.json',
      incoming: async (cwd, profile) => {
        const pkg = await readPackageJson(cwd);
        const scripts = Object.keys(pkg?.scripts ?? {});
        return buildTurboJson(scripts, profile);
      },
      kind: 'jsonMerge',
    },
  ],
});
