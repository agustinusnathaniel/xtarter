import { multiselect } from '@clack/prompts';
import type { Task, TaskStatus } from '@xtarterize/core';
import { abortIfCancelled } from '@xtarterize/core';

import { statusHint } from '@/utils/display.js';

export async function selectTasks(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>
): Promise<Array<string>> {
  const options = tasks.map((task) => ({
    hint: statusHint(statuses.get(task.id)),
    label: `${task.label} (${task.id})`,
    value: task.id,
  }));

  const defaultSelected = tasks
    .filter((t) => {
      const status = statuses.get(t.id);
      return status === 'new' || status === 'patch';
    })
    .map((t) => t.id);

  const selected = await multiselect({
    initialValues: defaultSelected,
    message: 'Select tasks to apply:',
    options,
  });

  abortIfCancelled(selected);

  if (Array.isArray(selected)) {
    return selected as Array<string>;
  }

  return [];
}
