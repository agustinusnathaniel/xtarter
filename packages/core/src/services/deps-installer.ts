import { Context, Effect, Layer } from 'effect';

import type { TaskDep } from '@/_base.js';
import { DepsInstallError } from '@/errors.js';
import { installDependenciesBatch } from '@/utils/pkg.js';

/** Installs task dependencies in batched dev/prod groups. */
export class DepsInstaller extends Context.Service<
  DepsInstaller,
  {
    install: (
      cwd: string,
      deps: ReadonlyArray<TaskDep>
    ) => Effect.Effect<void, DepsInstallError>;
  }
>()('xtarterize/DepsInstaller') {
  static readonly layer: Layer.Layer<DepsInstaller> = Layer.succeed(
    DepsInstaller,
    {
      install: (cwd, deps) =>
        Effect.tryPromise({
          catch: (cause) =>
            new DepsInstallError({
              cause,
              message: cause instanceof Error ? cause.message : String(cause),
            }),
          try: () => installDependenciesBatch(cwd, [...deps]),
        }),
    }
  );
}
