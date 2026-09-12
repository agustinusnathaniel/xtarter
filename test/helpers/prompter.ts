import type { PrompterShape } from '@xtarterize/app/ui/prompter.js';
import { Effect } from 'effect';

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
): PrompterShape {
  const confirms = [...(answers.confirms ?? [])];
  const groupMultiselects = [...(answers.groupMultiselects ?? [])];
  const multiselects = [...(answers.multiselects ?? [])];
  const selects = [...(answers.selects ?? [])];

  return {
    confirm: () => Effect.succeed(shiftOrNull<boolean>(confirms)),
    groupMultiselect: () =>
      Effect.succeed(shiftOrNull<Array<string>>(groupMultiselects)),
    multiselect: <Value>() =>
      Effect.succeed(shiftOrNull<Array<Value>>(multiselects)),
    select: <Value>() => Effect.succeed(shiftOrNull<Value>(selects)),
  };
}
