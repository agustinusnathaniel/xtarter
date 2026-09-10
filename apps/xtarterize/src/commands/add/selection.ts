import type { Prompter } from '@/ui/prompter.js';
import { statusHint } from '@/utils/display.js';

import type { TaskWithStatus } from './types.js';

export type { TaskWithStatus };

function buildGroupedOptions(
  tasksWithStatus: Array<TaskWithStatus>
): Record<string, Array<{ value: string; label: string }>> {
  const groups: Record<string, Array<{ value: string; label: string }>> = {};
  for (const entry of tasksWithStatus) {
    const group = entry.task.group;
    if (!groups[group]) {
      groups[group] = [];
    }
    const hint = statusHint(entry.status);
    groups[group].push({
      label: `${entry.task.label} (${entry.task.id})${hint ? ` - ${hint}` : ''}`,
      value: entry.task.id,
    });
  }
  return groups;
}

function getDefaultSelectedIds(
  tasksWithStatus: Array<TaskWithStatus>
): Array<string> {
  return tasksWithStatus
    .filter((t) => t.status === 'new' || t.status === 'patch')
    .map((t) => t.task.id);
}

/** Resolve the selected task IDs, or `null` when the user cancels. */
export async function selectTasksGrouped(
  tasksWithStatus: Array<TaskWithStatus>,
  prompter: Prompter
): Promise<Array<string> | null> {
  return prompter.groupMultiselect({
    initialValues: getDefaultSelectedIds(tasksWithStatus),
    message: 'Select tasks to add:',
    options: buildGroupedOptions(tasksWithStatus),
    required: true,
  });
}
