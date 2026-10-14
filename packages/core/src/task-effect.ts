import { Effect } from 'effect';

import type { TaskServices } from '@/_base.js';
import { TaskError } from '@/errors.js';
import { describeCause } from '@/utils/errors.js';

/**
 * Normalize a synchronous, Promise-, or Effect-returning invocation into one
 * lazy Effect. Throws and rejections become a `TaskError` carrying the cause's
 * message; an Effect result passes through untouched.
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
