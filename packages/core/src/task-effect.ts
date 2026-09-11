import { Effect } from 'effect';

import type { TaskServices } from '@/_base.js';
import { TaskError } from '@/errors.js';

export function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Normalize a Promise- or Effect-based task method into a single Effect.
 *
 * The invocation is lazy (`Effect.suspend`), synchronous throws and promise
 * rejections are mapped to `TaskError` with the same message text the engine
 * used before the Effect migration, and an already-Effect result passes
 * through untouched.
 */
export function toTaskEffect<A>(
  taskId: string,
  method: string,
  invoke: () => A | Promise<A> | Effect.Effect<A, TaskError, TaskServices>
): Effect.Effect<A, TaskError, TaskServices> {
  // `method` names the operation in the public conversion contract; the
  // engine still reports failures with the raw cause message it always did.
  void method;
  return Effect.suspend(() => {
    let result: A | Promise<A> | Effect.Effect<A, TaskError, TaskServices>;
    try {
      result = invoke();
    } catch (cause) {
      return Effect.fail(
        new TaskError({ cause, message: describeCause(cause), taskId })
      );
    }
    if (Effect.isEffect(result)) {
      return result as Effect.Effect<A, TaskError, TaskServices>;
    }
    return Effect.tryPromise({
      catch: (cause) =>
        new TaskError({ cause, message: describeCause(cause), taskId }),
      try: () => Promise.resolve(result),
    });
  });
}
