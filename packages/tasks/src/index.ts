import type { Task } from '@xtarterize/core';

import { agentsMdTask } from '@/agent/agents-md.js';
import { skillsInstallTask } from '@/agent/skills-install.js';
import { autoUpdateWorkflowTask } from '@/ci/auto-update.js';
import { ciWorkflowTask } from '@/ci/ci.js';
import { releaseWorkflowTask } from '@/ci/release.js';
import { plopTask } from '@/codegen/plop.js';
import { renovateTask } from '@/deps/renovate.js';
import { vscodeTask } from '@/editor/vscode.js';
import { packageScriptsTask } from '@/factory/package-scripts.js';
import { biomeTask, createBiomeTask } from '@/lint/biome.js';
import type { LintTaskOptions } from '@/lint/config-form.js';
import {
  createOxfmtTask,
  createOxlintTask,
  oxfmtTask,
  oxlintTask,
} from '@/lint/oxlint.js';
import { turboTask } from '@/monorepo/turbo.js';
import { npmrcTask } from '@/npmrc.js';
import { knipTask } from '@/quality/knip.js';
import { lintStagedTask } from '@/quality/lint-staged.js';
import { packageEnginesTask } from '@/quality/package-engines.js';
import { catVersionTask } from '@/release/cat-version.js';
import { commitlintTask } from '@/release/commitlint.js';
import { czgTask } from '@/release/czg.js';
import { gitHooksTask } from '@/release/git-hooks.js';
import { versionrcTask } from '@/release/versionrc.js';
import { gitignoreTsbuildinfoTask } from '@/ts/gitignore-tsbuildinfo.js';
import { incrementalTask } from '@/ts/incremental.js';
import { pathsTask } from '@/ts/paths.js';
import { strictTask } from '@/ts/strict.js';
import { viteCheckerTask } from '@/vite/checker.js';
import { viteVisualizerTask } from '@/vite/visualizer.js';
import { pnpmWorkspaceTask } from '@/workspace/pnpm-workspace.js';

/** Lint and format tasks lead the registry; `--eject` swaps their form. */
const lintTasks: Array<Task> = [biomeTask, oxlintTask, oxfmtTask];

/** The built-in task registry: the single source for `getAllTasks()`. */
const taskRegistry: Array<Task> = [
  ...lintTasks,
  strictTask,
  pathsTask,
  incrementalTask,
  gitignoreTsbuildinfoTask,
  viteCheckerTask,
  viteVisualizerTask,
  releaseWorkflowTask,
  autoUpdateWorkflowTask,
  ciWorkflowTask,
  renovateTask,
  commitlintTask,
  czgTask,
  catVersionTask,
  gitHooksTask,
  knipTask,
  lintStagedTask,
  packageEnginesTask,
  plopTask,
  pnpmWorkspaceTask,
  turboTask,
  versionrcTask,
  vscodeTask,
  agentsMdTask,
  skillsInstallTask,
  packageScriptsTask,
  npmrcTask,
];

export interface TaskRegistryOptions {
  /** Write ejected lint and format configs when they are created (ADR-043). */
  ejectLintConfigs?: boolean;
}

export function getAllTasks(options: TaskRegistryOptions = {}): Array<Task> {
  if (options.ejectLintConfigs !== true) {
    return taskRegistry;
  }
  const lintOptions: LintTaskOptions = { eject: true };
  return [
    createBiomeTask(lintOptions),
    createOxlintTask(lintOptions),
    createOxfmtTask(lintOptions),
    ...taskRegistry.slice(lintTasks.length),
  ];
}
