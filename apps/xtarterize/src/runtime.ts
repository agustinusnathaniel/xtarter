import {
  DepsInstaller,
  failureDetail,
  logError,
  ProcessRunner,
} from '@xtarterize/core';
import { Cause, Effect, Exit, Layer } from 'effect';

import { Prompter } from '@/ui/prompter.js';

/** The production wiring for every CLI command program. */
export const AppLayer = Layer.mergeAll(
  DepsInstaller.layer,
  ProcessRunner.layer,
  Prompter.layer
);

/**
 * No-op installer used when `XTARTERIZE_SKIP_REAL_INSTALL=1` is set.
 * The PR fast leg sets this to avoid real network installs; the
 * integration matrix leg leaves it unset to keep real-install fidelity.
 */
const SkipInstallLayer = Layer.succeed(DepsInstaller, {
  install: () => Effect.void,
});

/** App layer honoring the fast-leg install gate. */
function currentAppLayer(): Layer.Layer<
  DepsInstaller | ProcessRunner | Prompter
> {
  if (process.env.XTARTERIZE_SKIP_REAL_INSTALL === '1') {
    return Layer.mergeAll(
      SkipInstallLayer,
      ProcessRunner.layer,
      Prompter.layer
    );
  }
  return AppLayer;
}

const cliAbortController = new AbortController();

/** Abort the in-flight command program (SIGINT/SIGTERM). */
export function abortCliProgram(): void {
  cliAbortController.abort();
}

/**
 * The single runtime edge: run one command program with the app layer and
 * render any non-interrupt failure exactly once.
 *
 * A failed program resolves to `undefined` after setting `process.exitCode`;
 * callers must treat that as a stop signal. Interrupt-only exits keep the
 * process exit code at 0 (Ctrl+C behavior).
 */
export async function runCliProgram<A, E>(
  program: Effect.Effect<A, E, DepsInstaller | ProcessRunner | Prompter>,
  options: { signal?: AbortSignal } = {}
): Promise<A | undefined> {
  const exit = await Effect.runPromiseExit(
    Effect.provide(program, currentAppLayer()),
    {
      signal: options.signal ?? cliAbortController.signal,
    }
  );
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  if (Cause.hasInterruptsOnly(exit.cause)) {
    process.exitCode = 0;
    return undefined;
  }
  logError(failureDetail(exit.cause));
  process.exitCode = 1;
  return undefined;
}
