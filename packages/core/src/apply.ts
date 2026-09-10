import type { Task, TaskStatus } from '@/_base.js';
import type { ApplyResult } from '@/apply/execute.js';
import { executePlan } from '@/apply/execute.js';
import { planTasks } from '@/apply/plan.js';
import type { ProjectProfile } from '@/detect.js';

export type { ApplyResult } from '@/apply/execute.js';

export interface ApplyOptions {
  includeConflicts?: boolean;
  quiet?: boolean;
  selectedIds?: Array<string>;
}

export interface ApplyTasksOptions {
  cwd: string;
  includeConflicts?: boolean;
  profile: ProjectProfile;
  quiet?: boolean;
  selectedIds?: Array<string>;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}

export async function applyTasks(
  options: ApplyTasksOptions
): Promise<ApplyResult> {
  const { selectedIds } = options;
  const tasks = selectedIds
    ? options.tasks.filter((t) => selectedIds.includes(t.id))
    : options.tasks;
  const quiet = options.quiet ?? false;
  const plan = await planTasks({
    cwd: options.cwd,
    includeConflicts: options.includeConflicts ?? false,
    profile: options.profile,
    quiet,
    statuses: options.statuses,
    tasks,
  });
  return executePlan({
    cwd: options.cwd,
    plan,
    profile: options.profile,
    quiet,
  });
}
