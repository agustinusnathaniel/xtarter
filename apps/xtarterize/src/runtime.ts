import { DepsInstaller, logError, ProcessRunner } from '@xtarterize/core';
import { Cause, Effect, Exit, Layer, Option, Result } from 'effect';

import { Prompter } from '@/ui/prompter.js';
import { formatFailureText } from '@/utils/failure-text.js';

/** Services every CLI command program may require. */
export type AppServices = DepsInstaller | ProcessRunner | Prompter;

/** The production wiring for every CLI command program. */
export const AppLayer: Layer.Layer<AppServices> = Layer.mergeAll(
  DepsInstaller.layer,
  ProcessRunner.layer,
  Prompter.layer
);

const cliAbortController = new AbortController();

/** Abort the in-flight command program (SIGINT/SIGTERM). */
export function abortCliProgram(): void {
  cliAbortController.abort();
}

export interface RunCliProgramOptions {
  signal?: AbortSignal;
}

function renderFailure(cause: Cause.Cause<unknown>): void {
  const error = Cause.findErrorOption(cause);
  if (Option.isSome(error)) {
    logError(formatFailureText(error.value));
    return;
  }
  const defect = Cause.findDefect(cause);
  if (Result.isSuccess(defect)) {
    logError(formatFailureText(defect.success));
    return;
  }
  logError(Cause.pretty(cause));
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
  program: Effect.Effect<A, E, AppServices>,
  options: RunCliProgramOptions = {}
): Promise<A | undefined> {
  const exit = await Effect.runPromiseExit(Effect.provide(program, AppLayer), {
    signal: options.signal ?? cliAbortController.signal,
  });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  if (Cause.hasInterruptsOnly(exit.cause)) {
    process.exitCode = 0;
    return undefined;
  }
  renderFailure(exit.cause);
  process.exitCode = 1;
  return undefined;
}
