import type { Effect } from 'effect';

import type { ProjectProfile } from '@/detect.js';
import type { TaskError } from '@/errors.js';
import type { ProcessRunner } from '@/services/process-runner.js';

export type TaskStatus = 'new' | 'patch' | 'skip' | 'conflict';

export type TaskScope = 'root' | 'package' | 'both';

export interface DiffHunk {
  added: number;
  header: string;
  lines: Array<string>;
  removed: number;
}

export interface ChangeStats {
  added: number;
  removed: number;
}

export interface SemanticEntry {
  added?: Record<string, string>;
  modified?: Record<string, { before: string; after: string }>;
  removed?: Record<string, string>;
}

export interface FileDiff {
  after: string;
  before: string | null;
  filepath: string;
  hunks?: Array<DiffHunk>;
  semantic?: SemanticEntry;
  stats?: ChangeStats;
}

export interface TaskSearchMeta {
  /** Config files this task modifies, e.g. ["tsconfig.json", "biome.json"] */
  configTargets: Array<string>;
  /** Extra keywords for search not obvious from label/id, e.g. ["types", "type-safe", "strict"] */
  keywords: Array<string>;
  /** Descriptive tags/categories for search, e.g. ["type-safe", "compiler-options"] */
  tags: Array<string>;
}

/** A dependency the apply plan installs before tasks run. */
export interface TaskDep {
  depName: string;
  dev: boolean;
}

/** Services an Effect task may require while running. */
export type TaskServices = ProcessRunner;

interface TaskBase {
  applicable: (profile: ProjectProfile) => boolean;
  group: string;
  id: string;
  label: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

/** A task whose methods are plain promises (the original contract). */
export interface PromiseTask extends TaskBase {
  apply: (cwd: string, profile: ProjectProfile) => Promise<void>;
  check: (cwd: string, profile: ProjectProfile) => Promise<TaskStatus>;
  dryRun: (cwd: string, profile: ProjectProfile) => Promise<Array<FileDiff>>;
  /** Optional: declare dependencies needed by this task.
   * When implemented, the `planTasks`/`executePlan` pipeline batches these
   * across all tasks into a single install call before running any apply(). */
  getDeps?: (cwd: string, profile: ProjectProfile) => Promise<Array<TaskDep>>;
}

/** A task whose methods return effects requiring `TaskServices`. */
export interface EffectTask extends TaskBase {
  apply: (
    cwd: string,
    profile: ProjectProfile
  ) => Effect.Effect<void, TaskError, TaskServices>;
  check: (
    cwd: string,
    profile: ProjectProfile
  ) => Effect.Effect<TaskStatus, TaskError, TaskServices>;
  dryRun: (
    cwd: string,
    profile: ProjectProfile
  ) => Effect.Effect<Array<FileDiff>, TaskError, TaskServices>;
  /** Optional: declare dependencies needed by this task.
   * When implemented, the `planTasks`/`executePlan` pipeline batches these
   * across all tasks into a single install call before running any apply(). */
  getDeps?: (
    cwd: string,
    profile: ProjectProfile
  ) => Effect.Effect<Array<TaskDep>, TaskError, TaskServices>;
}

export type Task = PromiseTask | EffectTask;
