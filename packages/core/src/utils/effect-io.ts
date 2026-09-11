import { Effect } from 'effect';

import { FileSystemError } from '@/errors.js';
import { readPackageJson } from '@/utils/pkg.js';

/** Run a promise-returning function as a FileSystemError Effect. */
export function tryEffect<A>(
  f: () => Promise<A>
): Effect.Effect<A, FileSystemError> {
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: 'unknown' }),
    try: (_signal) => f(),
  });
}

/** Read package.json, treating read or parse failures as `null`. */
export function tryReadPackageJson(
  cwd: string
): Effect.Effect<Awaited<ReturnType<typeof readPackageJson>>, FileSystemError> {
  return Effect.orElseSucceed(
    tryEffect(() => readPackageJson(cwd)),
    () => null as Awaited<ReturnType<typeof readPackageJson>>
  );
}
