import type { Task, TaskStatus } from '@xtarterize/core';
import { Effect } from 'effect';

import { type PromptError, Prompter } from '@/ui/prompter.js';
import { defaultSelectedIds, statusHint } from '@/utils/display.js';

/** Resolve selected task IDs, or `null` when the user cancels the prompt. */
export function selectTasks(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>
): Effect.Effect<Array<string> | null, PromptError, Prompter> {
  const options = tasks.map((task) => ({
    hint: statusHint(statuses.get(task.id)),
    label: `${task.label} (${task.id})`,
    value: task.id,
  }));

  const defaultSelected = defaultSelectedIds(
    tasks.map((task) => ({ status: statuses.get(task.id), task }))
  );

  return Effect.flatMap(Prompter, (prompter) =>
    prompter.multiselect<string>({
      initialValues: defaultSelected,
      message: 'Select tasks to apply:',
      options,
    })
  );
}
