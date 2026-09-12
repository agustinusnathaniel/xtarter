import {
  confirm,
  groupMultiselect,
  isCancel,
  multiselect,
  type Option,
  select,
} from '@clack/prompts';
import { Context, Data, Effect, Layer } from 'effect';

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

/** Raised when a clack prompt rejects. Cancellation resolves to `null`. */
export class PromptError extends Data.TaggedError('PromptError')<{
  readonly cause: unknown;
  readonly message: string;
}> {}

/**
 * Interactive prompt seam. Production provides the clack adapter; tests
 * provide a scripted adapter. `null` means the user cancelled the prompt.
 */
export interface PrompterShape {
  confirm: (
    options: ConfirmPromptOptions
  ) => Effect.Effect<boolean | null, PromptError>;
  groupMultiselect: (
    options: TaskGroupSelectionOptions
  ) => Effect.Effect<Array<string> | null, PromptError>;
  multiselect: <Value>(
    options: MultiSelectPromptOptions<Value>
  ) => Effect.Effect<Array<Value> | null, PromptError>;
  select: <Value>(
    options: SelectPromptOptions<Value>
  ) => Effect.Effect<Value | null, PromptError>;
}

function asPromptError(cause: unknown): PromptError {
  return new PromptError({
    cause,
    message: cause instanceof Error ? cause.message : String(cause),
  });
}

async function unwrapCancel<T>(answer: Promise<T | symbol>): Promise<T | null> {
  const result = await answer;
  return isCancel(result) ? null : result;
}

function toEffect<T>(
  answer: Promise<T | symbol>
): Effect.Effect<T | null, PromptError> {
  return Effect.tryPromise({
    catch: asPromptError,
    try: () => unwrapCancel(answer),
  });
}

function clackPrompter(): PrompterShape {
  return {
    confirm: ({ message }) => toEffect(confirm({ message })),
    groupMultiselect: (options) => toEffect(groupMultiselect(options)),
    multiselect: <Value>(options: MultiSelectPromptOptions<Value>) =>
      toEffect(multiselect<Value>(options)),
    select: <Value>(options: SelectPromptOptions<Value>) =>
      toEffect(select<Value>(options)),
  };
}

/** The interactive prompt service, provided by `Prompter.layer` or a stub. */
export class Prompter extends Context.Service<Prompter, PrompterShape>()(
  'xtarterize/Prompter'
) {
  static readonly layer: Layer.Layer<Prompter> = Layer.succeed(
    Prompter,
    clackPrompter()
  );
}
