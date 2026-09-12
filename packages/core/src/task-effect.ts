import { Effect } from 'effect';

import type { TaskServices } from '@/_base.js';
import { TaskError } from '@/errors.js';
import { describeCause } from '@/utils/errors.js';

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
  invoke: () => A | Promise<A> | Effect.Effect<A, TaskError, TaskServices>
): Effect.Effect<A, TaskError, TaskServices> {
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
