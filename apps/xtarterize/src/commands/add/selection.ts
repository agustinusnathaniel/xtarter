import { groupMultiselect } from '@clack/prompts';

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

export async function selectTasksGrouped(
  tasksWithStatus: Array<TaskWithStatus>
): Promise<Array<string>> {
  const groups = buildGroupedOptions(tasksWithStatus);
  const defaultSelected = getDefaultSelectedIds(tasksWithStatus);

  const selected = await groupMultiselect({
    initialValues: defaultSelected,
    message: 'Select tasks to add:',
    options: groups,
    required: true,
  });

  if (Array.isArray(selected)) {
    return selected as Array<string>;
  }

  return [];
}
