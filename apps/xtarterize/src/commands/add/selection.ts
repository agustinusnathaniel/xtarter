import { Effect } from 'effect';

import { type PromptError, Prompter } from '@/ui/prompter.js';
import { defaultSelectedIds, statusHint } from '@/utils/display.js';

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

/** Resolve the selected task IDs, or `null` when the user cancels. */
export function selectTasksGrouped(
  tasksWithStatus: Array<TaskWithStatus>
): Effect.Effect<Array<string> | null, PromptError, Prompter> {
  return Effect.flatMap(Prompter, (prompter) =>
    prompter.groupMultiselect({
      initialValues: defaultSelectedIds(tasksWithStatus),
      message: 'Select tasks to add:',
      options: buildGroupedOptions(tasksWithStatus),
      required: true,
    })
  );
}
