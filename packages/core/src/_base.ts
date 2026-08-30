import type { ProjectProfile } from '@/detect.js';

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

export interface Task {
  applicable: (profile: ProjectProfile) => boolean;
  apply: (cwd: string, profile: ProjectProfile) => Promise<void>;
  check: (cwd: string, profile: ProjectProfile) => Promise<TaskStatus>;
  dryRun: (cwd: string, profile: ProjectProfile) => Promise<Array<FileDiff>>;
  /** Optional: declare dependencies needed by this task.
   * When implemented, the applyTasks pipeline batches these across
   * all tasks into a single install call before running any apply(). */
  getDeps?: (
    cwd: string,
    profile: ProjectProfile
  ) => Promise<Array<{ depName: string; dev: boolean }>>;
  group: string;
  id: string;
  label: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}
