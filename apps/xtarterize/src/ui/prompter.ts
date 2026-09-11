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

export function createClackPrompter(): Prompter {
  return {
    async confirm({ message }) {
      const answer = await confirm({ message });
      return isCancel(answer) ? null : answer;
    },
    async groupMultiselect(options) {
      const answer = await groupMultiselect(options);
      return isCancel(answer) ? null : answer;
    },
    async multiselect(options) {
      const answer = await multiselect(options);
      return isCancel(answer) ? null : answer;
    },
    async select(options) {
      const answer = await select(options);
      return isCancel(answer) ? null : answer;
    },
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
    async confirm() {
      return shiftOrNull<boolean>(confirms);
    },
    async groupMultiselect() {
      return shiftOrNull<Array<string>>(groupMultiselects);
    },
    async multiselect<Value>() {
      return shiftOrNull<Array<Value>>(multiselects);
    },
    async select<Value>() {
      return shiftOrNull<Value>(selects);
    },
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
