import type { Task, TaskStatus } from '@xtarterize/core';

import type { Prompter } from '@/ui/prompter.js';
import { statusHint } from '@/utils/display.js';

/** Resolve selected task IDs, or `null` when the user cancels the prompt. */
export async function selectTasks(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>,
  prompter: Prompter
): Promise<Array<string> | null> {
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

  return prompter.multiselect<string>({
    initialValues: defaultSelected,
    message: 'Select tasks to apply:',
    options,
  });
}
