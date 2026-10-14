import type {
  ProcessRunner,
  ProjectProfile,
  Task,
  TaskChoiceOption,
  TaskError,
} from '@xtarterize/core';
import { Effect } from 'effect';

import { type PromptError, Prompter } from '@/ui/prompter.js';

type ChoiceGroups = Record<string, Array<TaskChoiceOption>>;

function countOptions(groups: ChoiceGroups): number {
  return Object.values(groups).reduce(
    (sum, options) => sum + options.length,
    0
  );
}

function allValues(groups: ChoiceGroups): Array<string> {
  return Object.values(groups)
    .flat()
    .map((option) => option.value);
}

function refineTask(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<
  Task | 'drop' | null,
  PromptError | TaskError,
  Prompter | ProcessRunner
> {
  if (!task.choices) {
    return Effect.succeed(task);
  }
  const choices = task.choices;
  return Effect.gen(function* () {
    const grouped = yield* choices.options(cwd, profile);
    const total = countOptions(grouped);
    if (total <= 1) {
      return task;
    }
    const prompter = yield* Prompter;
    const mode = yield* prompter.select({
      message: `${task.label}: ${total} options`,
      options: [
        { label: 'Install all', value: 'all' },
        { label: 'Choose…', value: 'choose' },
        { label: 'Skip', value: 'skip' },
      ],
    });
    if (mode === null) {
      return null;
    }
    if (mode === 'all') {
      return task;
    }
    if (mode === 'skip') {
      return 'drop' as const;
    }
    const picked = yield* prompter.groupMultiselect({
      initialValues: allValues(grouped),
      message: choices.message,
      options: grouped,
      required: false,
    });
    if (picked === null) {
      return null;
    }
    if (picked.length === 0) {
      return 'drop' as const;
    }
    return choices.restrict(picked);
  });
}

/**
 * Let the user narrow each task that offers choices. Returns `null` on cancel;
 * tasks narrowed to nothing are dropped.
 */
export function refineTaskChoices(
  tasks: Array<Task>,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<
  Array<Task> | null,
  PromptError | TaskError,
  Prompter | ProcessRunner
> {
  return Effect.gen(function* () {
    const refined: Array<Task> = [];
    for (const task of tasks) {
      const next = yield* refineTask(task, cwd, profile);
      if (next === null) {
        return null;
      }
      if (next !== 'drop') {
        refined.push(next);
      }
    }
    return refined;
  });
}
