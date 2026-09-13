import type {
  ProjectProfile,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@xtarterize/core';
import { Effect } from 'effect';

/** Identity, behavior, and metadata overrides accepted by `makeTask`. */
export interface MakeTaskOptions {
  applicable?: Task['applicable'];
  apply?: Task['apply'];
  /** Fixed status or a full override for failure-path tests. */
  check?: (() => Effect.Effect<TaskStatus>) | TaskStatus;
  /** Shorthand for a bare `searchMeta` built from config targets. */
  configTargets?: Array<string>;
  dryRun?: Task['dryRun'];
  getDeps?: Task['getDeps'];
  group?: string;
  id?: string;
  label?: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

/** Build a `Task` whose hooks default to no-op success. */
export function makeTask(options: MakeTaskOptions = {}): Task {
  const task: Task = {
    applicable: options.applicable ?? (() => true),
    apply: options.apply ?? (() => Effect.void),
    check:
      typeof options.check === 'function'
        ? options.check
        : () => Effect.succeed(options.check ?? 'new'),
    dryRun: options.dryRun ?? (() => Effect.succeed([])),
    group: options.group ?? 'Test',
    id: options.id ?? 'mock/task',
    label: options.label ?? 'Mock Task',
    scope: options.scope,
    searchMeta:
      options.searchMeta ??
      (options.configTargets
        ? { configTargets: options.configTargets, keywords: [], tags: [] }
        : undefined),
  };
  if (options.getDeps) {
    task.getDeps = options.getDeps;
  }
  return task;
}

/** Task statuses keyed by id, for annotation tests. */
export function makeStatuses(
  entries: Array<[string, TaskStatus]>
): Map<string, TaskStatus> {
  return new Map(entries);
}

const baseProfile: ProjectProfile = {
  bundler: null,
  existing: {
    agentsMd: false,
    biome: false,
    changeset: false,
    commitlint: false,
    eslint: false,
    githubWorkflows: [],
    gitignore: false,
    knip: false,
    oxfmt: false,
    oxlint: false,
    plop: false,
    renovate: false,
    tsconfig: false,
    turbo: false,
    versionrc: false,
    vscodeSettings: false,
  },
  framework: 'node',
  frameworkVersion: null,
  hasGit: false,
  hasGitHub: false,
  monorepo: false,
  monorepoTool: null,
  nodeVersion: '20',
  packageManager: 'pnpm',
  router: null,
  runtime: 'node',
  styling: ['vanilla'],
  typescript: false,
  vitePlus: false,
  workspaceRoot: false,
};

/** Default profile; override any field for the case under test. */
export function makeProfile(
  overrides: Partial<ProjectProfile> = {}
): ProjectProfile {
  return { ...baseProfile, ...overrides };
}
