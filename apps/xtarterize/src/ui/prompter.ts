import {
  confirm,
  groupMultiselect,
  isCancel,
  multiselect,
  type Option,
  select,
} from '@clack/prompts';

export interface ConfirmPromptOptions {
  message: string;
}

export interface SelectPromptOptions<Value> {
  message: string;
  options: Array<Option<Value>>;
}

export interface MultiSelectPromptOptions<Value> {
  initialValues?: Array<Value>;
  message: string;
  options: Array<Option<Value>>;
  required?: boolean;
}

export interface TaskGroupSelectionOptions {
  initialValues: Array<string>;
  message: string;
  options: Record<string, Array<{ label: string; value: string }>>;
  required: boolean;
}

/**
 * Interactive prompt seam. Production injects the clack adapter; tests inject
 * a scripted adapter. `null` means the user cancelled the prompt.
 */
export interface Prompter {
  confirm: (options: ConfirmPromptOptions) => Promise<boolean | null>;
  groupMultiselect: (
    options: TaskGroupSelectionOptions
  ) => Promise<Array<string> | null>;
  multiselect: <Value>(
    options: MultiSelectPromptOptions<Value>
  ) => Promise<Array<Value> | null>;
  select: <Value>(options: SelectPromptOptions<Value>) => Promise<Value | null>;
}

async function unwrapCancel<T>(answer: Promise<T | symbol>): Promise<T | null> {
  const result = await answer;
  return isCancel(result) ? null : result;
}

export function createClackPrompter(): Prompter {
  return {
    confirm: async ({ message }) => unwrapCancel(confirm({ message })),
    groupMultiselect: async (options) =>
      unwrapCancel(groupMultiselect(options)),
    multiselect: async <Value>(options: MultiSelectPromptOptions<Value>) =>
      unwrapCancel(multiselect<Value>(options)),
    select: async <Value>(options: SelectPromptOptions<Value>) =>
      unwrapCancel(select<Value>(options)),
  };
}

/** Answers consumed by `createScriptedPrompter`, one queue per prompt kind. */
export interface ScriptedPrompterAnswers {
  confirms?: Array<boolean | null>;
  groupMultiselects?: Array<Array<string> | null>;
  multiselects?: Array<Array<string> | null>;
  selects?: Array<unknown>;
}

function shiftOrNull<Value>(queue: Array<unknown>): Value | null {
  const next = queue.shift();
  return next === undefined ? null : (next as Value | null);
}

/**
 * Deterministic prompter for tests: each prompt kind consumes its own queue in
 * call order, and an exhausted queue answers `null` (cancel).
 */
export function createScriptedPrompter(
  answers: ScriptedPrompterAnswers = {}
): Prompter {
  const confirms = [...(answers.confirms ?? [])];
  const groupMultiselects = [...(answers.groupMultiselects ?? [])];
  const multiselects = [...(answers.multiselects ?? [])];
  const selects = [...(answers.selects ?? [])];

  return {
    confirm: async () => shiftOrNull<boolean>(confirms),
    groupMultiselect: async () => shiftOrNull<Array<string>>(groupMultiselects),
    multiselect: async <Value>() => shiftOrNull<Array<Value>>(multiselects),
    select: async <Value>() => shiftOrNull<Value>(selects),
  };
}

let activePrompter: Prompter | null = null;

/**
 * Provide the process-wide prompter for tests. `null` restores the clack
 * adapter used by production runs.
 */
export function setPrompter(prompter: Prompter | null): void {
  activePrompter = prompter;
}

/** The prompter active for this process: injected in tests, clack otherwise. */
export function getPrompter(): Prompter {
  return activePrompter ?? createClackPrompter();
}
